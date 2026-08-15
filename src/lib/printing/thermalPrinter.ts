import { Capacitor } from '@capacitor/core';
import { CapacitorThermalPrinter, type BluetoothDevice } from 'capacitor-thermal-printer';
import { formatDateTime } from '@/lib/format';
import type { EntryTicket } from '@/features/guard/api';

const SAVED_PRINTER_KEY = 'parking.pt210.printer.v1';
const PT210_PAPER_WIDTH_MM = 48;
const SCAN_TIMEOUT_MS = 8_000;
const BLE_CHUNK_SIZE = 20;
const BLE_WRITE_DELAY_MS = 5;
const SAFE_TEAR_FEED_LINES = 6;
const SAFE_TEAR_MARGIN_DOTS = 144;

const BLE_PROFILES = [
  { service: '0000ff00-0000-1000-8000-00805f9b34fb', write: '0000ff02-0000-1000-8000-00805f9b34fb' },
  { service: '0000ffe0-0000-1000-8000-00805f9b34fb', write: '0000ffe1-0000-1000-8000-00805f9b34fb' },
  { service: '000018f0-0000-1000-8000-00805f9b34fb', write: '00002af1-0000-1000-8000-00805f9b34fb' },
] as const;

type BrowserBluetoothCharacteristic = {
  writeValue: (value: ArrayBuffer) => Promise<void>;
  writeValueWithoutResponse?: (value: ArrayBuffer) => Promise<void>;
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
};

type BrowserBluetoothService = {
  getCharacteristic: (characteristic: string) => Promise<BrowserBluetoothCharacteristic>;
  getCharacteristics?: () => Promise<BrowserBluetoothCharacteristic[]>;
};

type BrowserBluetoothGatt = {
  connected: boolean;
  connect: () => Promise<BrowserBluetoothGatt>;
  disconnect: () => void;
  getPrimaryService: (service: string) => Promise<BrowserBluetoothService>;
  getPrimaryServices?: () => Promise<BrowserBluetoothService[]>;
};

type BrowserBluetoothDevice = {
  id: string;
  name?: string;
  gatt?: BrowserBluetoothGatt;
};

type BrowserBluetooth = {
  requestDevice: (options: {
    filters?: Array<{ services: string[] }>;
    acceptAllDevices?: boolean;
    optionalServices: string[];
  }) => Promise<BrowserBluetoothDevice>;
  getDevices?: () => Promise<BrowserBluetoothDevice[]>;
};

type NavigatorWithBluetooth = Navigator & { bluetooth?: BrowserBluetooth };

let lastBrowserDevice: BrowserBluetoothDevice | null = null;
let lastNativeConnectedAddress: string | null = null;

export interface ThermalPrinterDevice {
  name: string;
  address: string;
}

export class ThermalPrinterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermalPrinterError';
  }
}

export class ThermalPrinterUnavailableError extends ThermalPrinterError {
  constructor() {
    super('Bluetooth printing is not available in this browser.');
    this.name = 'ThermalPrinterUnavailableError';
  }
}

export class ThermalPrinterNotConfiguredError extends ThermalPrinterError {
  constructor() {
    super('Connect a printer before printing.');
    this.name = 'ThermalPrinterNotConfiguredError';
  }
}

function assertNativePrinterSupport(): void {
  if (!Capacitor.isNativePlatform()) throw new ThermalPrinterUnavailableError();
}

function browserBluetooth(): BrowserBluetooth | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as NavigatorWithBluetooth).bluetooth ?? null;
}

function printerStorageKey(locationId?: string | null): string {
  return locationId ? `${SAVED_PRINTER_KEY}.${locationId}` : SAVED_PRINTER_KEY;
}

function readSavedPrinter(locationId?: string | null): ThermalPrinterDevice | null {
  try {
    const raw = localStorage.getItem(printerStorageKey(locationId));
    // Keep existing installations working after printer storage becomes
    // location-aware. A printer selected before this change is used as a
    // one-time compatibility fallback until the guard selects one for the
    // current location.
    const fallback = locationId && !raw ? localStorage.getItem(SAVED_PRINTER_KEY) : raw;
    if (!fallback) return null;
    const value = JSON.parse(fallback) as Partial<ThermalPrinterDevice>;
    if (typeof value.name !== 'string' || typeof value.address !== 'string' || !value.address) return null;
    return { name: value.name, address: value.address };
  } catch {
    return null;
  }
}

function savePrinter(device: ThermalPrinterDevice, locationId?: string | null): void {
  localStorage.setItem(printerStorageKey(locationId), JSON.stringify(device));
}

function normalizeDevice(device: BluetoothDevice | BrowserBluetoothDevice): ThermalPrinterDevice {
  const address = 'address' in device ? device.address : device.id;
  return {
    name: device.name?.trim() || 'PT-210 printer',
    address,
  };
}

export function getSavedThermalPrinter(locationId?: string | null): ThermalPrinterDevice | null {
  return readSavedPrinter(locationId);
}

export function isThermalPrintingAvailable(): boolean {
  return Capacitor.isNativePlatform() || browserBluetooth() !== null;
}

export async function isThermalPrinterConnected(locationId?: string | null): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const connected = await CapacitorThermalPrinter.isConnected();
      if (!connected || !locationId || !lastNativeConnectedAddress) return connected;
      const saved = readSavedPrinter(locationId);
      return !saved || saved.address === lastNativeConnectedAddress;
    } catch {
      return false;
    }
  }

  const saved = readSavedPrinter(locationId);
  if (!saved) return false;
  try {
    const device = await findBrowserDevice(saved.address);
    return !!device?.gatt?.connected;
  } catch {
    return false;
  }
}

async function scanNativeThermalPrinters(): Promise<ThermalPrinterDevice[]> {
  assertNativePrinterSupport();

  const devices = new Map<string, ThermalPrinterDevice>();
  let finished = false;
  let finishScan: () => void = () => undefined;
  const scanFinished = new Promise<void>((resolve) => {
    finishScan = resolve;
  });
  const discovered = await CapacitorThermalPrinter.addListener('discoverDevices', ({ devices: found }) => {
    for (const device of found) {
      const normalized = normalizeDevice(device);
      if (normalized.address) devices.set(normalized.address, normalized);
    }
  });
  const completed = await CapacitorThermalPrinter.addListener('discoveryFinish', () => {
    if (!finished) {
      finished = true;
      finishScan();
    }
  });

  try {
    await CapacitorThermalPrinter.startScan();
    await Promise.race([
      scanFinished,
      new Promise<void>((resolve) => window.setTimeout(resolve, SCAN_TIMEOUT_MS)),
    ]);
  } finally {
    if (!finished) {
      finished = true;
      await CapacitorThermalPrinter.stopScan().catch(() => undefined);
    }
    await discovered.remove();
    await completed.remove();
  }

  return [...devices.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function scanBrowserThermalPrinters(): Promise<ThermalPrinterDevice[]> {
  const bluetooth = browserBluetooth();
  if (!bluetooth) throw new ThermalPrinterUnavailableError();

  const device = await bluetooth.requestDevice({
    // Some PT-210 firmware does not advertise its printer service UUID even
    // though the service is available after GATT connection. Filtering here
    // would make Bluefy hide a valid printer from the chooser.
    acceptAllDevices: true,
    optionalServices: BLE_PROFILES.map(({ service }) => service),
  });
  lastBrowserDevice = device;
  return [normalizeDevice({ id: device.id, name: device.name })];
}

export async function scanThermalPrinters(): Promise<ThermalPrinterDevice[]> {
  return Capacitor.isNativePlatform() ? scanNativeThermalPrinters() : scanBrowserThermalPrinters();
}

async function findBrowserDevice(address: string): Promise<BrowserBluetoothDevice | null> {
  const bluetooth = browserBluetooth();
  if (lastBrowserDevice?.id === address) return lastBrowserDevice;
  if (!bluetooth?.getDevices) return null;
  return (await bluetooth.getDevices()).find((device) => device.id === address) ?? null;
}

async function connectBrowserDevice(device: BrowserBluetoothDevice): Promise<BrowserBluetoothCharacteristic> {
  if (!device.gatt) throw new ThermalPrinterError('The selected Bluetooth device does not expose GATT.');
  const gatt = device.gatt.connected ? device.gatt : await device.gatt.connect();

  for (const profile of BLE_PROFILES) {
    try {
      const service = await gatt.getPrimaryService(profile.service);
      return await service.getCharacteristic(profile.write);
    } catch {
      // Try the next common PT-210 service profile.
    }
  }

  // Fall back to service discovery for PT-210 firmware variants that use a
  // different serial UUID while still exposing a writable BLE characteristic.
  if (gatt.getPrimaryServices) {
    for (const service of await gatt.getPrimaryServices()) {
      if (!service.getCharacteristics) continue;
      for (const characteristic of await service.getCharacteristics()) {
        if (characteristic.properties?.writeWithoutResponse || characteristic.properties?.write) return characteristic;
      }
    }
  }

  gatt.disconnect();
  throw new ThermalPrinterError('This device is not a compatible thermal printer.');
}

export async function selectThermalPrinter(device: ThermalPrinterDevice, locationId?: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (lastNativeConnectedAddress && lastNativeConnectedAddress !== device.address) {
      await CapacitorThermalPrinter.disconnect().catch(() => undefined);
    }
    const connected = await CapacitorThermalPrinter.connect({ address: device.address });
    if (!connected) throw new ThermalPrinterError('We could not connect to the printer. Make sure it is on and nearby.');
    const selected = { name: connected.name || device.name, address: connected.address || device.address };
    lastNativeConnectedAddress = selected.address;
    savePrinter(selected, locationId);
    return;
  }

  const browserDevice = await findBrowserDevice(device.address);
  if (!browserDevice) {
    throw new ThermalPrinterError('Select the printer again to allow Bluetooth access.');
  }
  await connectBrowserDevice(browserDevice);
  savePrinter(device, locationId);
}

export async function disconnectThermalPrinter(locationId?: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (await isThermalPrinterConnected(locationId)) await CapacitorThermalPrinter.disconnect();
    lastNativeConnectedAddress = null;
    return;
  }

  const saved = readSavedPrinter(locationId);
  const device = saved ? await findBrowserDevice(saved.address) : lastBrowserDevice;
  if (device?.gatt?.connected) device.gatt.disconnect();
}

async function ensureNativeThermalPrinterConnected(locationId?: string | null): Promise<void> {
  assertNativePrinterSupport();
  const saved = readSavedPrinter(locationId);
  if (!saved) throw new ThermalPrinterNotConfiguredError();
  if (!(await isThermalPrinterConnected(locationId))) await selectThermalPrinter(saved, locationId);
}

async function ensureBrowserThermalPrinterConnected(locationId?: string | null): Promise<BrowserBluetoothCharacteristic> {
  const saved = readSavedPrinter(locationId);
  if (!saved) throw new ThermalPrinterNotConfiguredError();
  const device = await findBrowserDevice(saved.address);
  if (!device) throw new ThermalPrinterError('Reconnect the printer before printing.');
  return connectBrowserDevice(device);
}

function asciiSafe(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
}

function concatBytes(...parts: number[][]): number[] {
  return parts.flat();
}

function wrapReceiptText(value: string, maxCharacters: number): string[] {
  const words = asciiSafe(value).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= maxCharacters) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadReceiptImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new ThermalPrinterError('The ticket QR code could not be prepared for printing.'));
    image.src = dataUri;
  });
}

function receiptRasterBytes(canvas: HTMLCanvasElement): number[] {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new ThermalPrinterError('The ticket could not be prepared for printing.');

  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex += 1) {
      let value = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const x = byteIndex * 8 + bit;
        if (x >= width) continue;
        const pixelIndex = (y * width + x) * 4;
        const luminance = (pixels[pixelIndex] * 299 + pixels[pixelIndex + 1] * 587 + pixels[pixelIndex + 2] * 114) / 1000;
        if (pixels[pixelIndex + 3] > 0 && luminance < 180) value |= 0x80 >> bit;
      }
      bitmap.push(value);
    }
  }

  return concatBytes(
    [0x1b, 0x40],
    // GS v 0: raster bit image, normal size. The PT-210 prints this as a
    // monochrome receipt instead of trying to interpret receipt text bytes.
    [0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff],
    bitmap,
    // PT-210 is manually torn and has no cutter. Feed extra blank lines so
    // the ticket code remains safely above the tear line. ESC d feeds paper
    // without sending a printable line-ending character to the printer.
    [0x1b, 0x64, SAFE_TEAR_FEED_LINES],
  );
}

async function browserTicketBytes(ticket: EntryTicket): Promise<number[]> {
  const width = 384;
  const padding = 18;
  const lineHeight = 30;
  const bodyFont = '22px monospace';
  const detailLines = [
    ...wrapReceiptText(`Plate: ${ticket.plateNumber}`, 28),
    ...wrapReceiptText(`Entry: ${formatDateTime(ticket.entryTime)}`, 28),
  ];
  const locationLines = wrapReceiptText(ticket.locationName, 28);
  const qrSize = 220;
  const headerHeight = 52;
  const locationHeight = locationLines.length * lineHeight + 26;
  const detailsHeight = detailLines.length * lineHeight + 50;
  const qrTop = headerHeight + locationHeight + detailsHeight;
  const ticketCodeTop = qrTop + qrSize + 70;
  // Keep a physical blank margin inside the raster itself. Some PT-210 units
  // ignore ESC d paper-feed commands, so the ticket code must not end at the
  // last printed raster row.
  const height = ticketCodeTop + 72 + SAFE_TEAR_MARGIN_DOTS;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ThermalPrinterError('The ticket could not be prepared for printing.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = 'bold 32px monospace';
  context.fillText('PARKING TICKET', width / 2, 16);

  context.font = bodyFont;
  locationLines.forEach((line, index) => context.fillText(line, width / 2, headerHeight + index * lineHeight));
  const dividerY = headerHeight + locationLines.length * lineHeight + 8;
  context.fillRect(padding, dividerY, width - padding * 2, 2);

  context.textAlign = 'left';
  detailLines.forEach((line, index) => context.fillText(line, padding, dividerY + 18 + index * lineHeight));

  context.textAlign = 'center';
  context.font = 'bold 20px monospace';
  context.fillText('SCAN TO VIEW OR PAY', width / 2, qrTop - 28);
  const qrImage = await loadReceiptImage(ticket.qrCodeDataUri);
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#ffffff';
  context.fillRect((width - qrSize) / 2, qrTop, qrSize, qrSize);
  context.drawImage(qrImage, (width - qrSize) / 2, qrTop, qrSize, qrSize);

  context.fillStyle = '#000000';
  context.font = bodyFont;
  context.fillText('TICKET CODE', width / 2, ticketCodeTop - 34);
  context.font = 'bold 32px monospace';
  context.fillText(asciiSafe(ticket.ticketCode), width / 2, ticketCodeTop);

  return receiptRasterBytes(canvas);
}

async function writeBrowserBytes(characteristic: BrowserBluetoothCharacteristic, bytes: number[]): Promise<void> {
  for (let offset = 0; offset < bytes.length; offset += BLE_CHUNK_SIZE) {
    const chunk = new Uint8Array(bytes.slice(offset, offset + BLE_CHUNK_SIZE));
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk.buffer);
    } else {
      await characteristic.writeValue(chunk.buffer);
    }
    // PT-210 BLE firmware can acknowledge a write before it has consumed the
    // previous 20-byte packet. Keep a small gap to prevent dropped image bytes.
    if (offset + BLE_CHUNK_SIZE < bytes.length) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, BLE_WRITE_DELAY_MS));
    }
  }
}

/**
 * Sends a 48 mm / 384-dot PT-210 ticket. Native builds use the printer SDK;
 * Android Chrome uses Web Bluetooth and writes chunked ESC/POS bytes directly.
 */
export async function printEntryTicket(ticket: EntryTicket, locationId?: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await ensureNativeThermalPrinterConnected(locationId);
    await CapacitorThermalPrinter.begin()
      .dpi(200)
      .limitWidth(PT210_PAPER_WIDTH_MM)
      .lineSpacing(0)
      .align('center')
      .bold()
      .doubleWidth()
      .text('PARKING TICKET\n')
      .clearFormatting()
      .text(`${asciiSafe(ticket.locationName)}\n`)
      .text('------------------------------\n')
      .align('left')
      .text(`Plate: ${asciiSafe(ticket.plateNumber)}\n`)
      .text(`Entry: ${asciiSafe(formatDateTime(ticket.entryTime))}\n`)
      .align('center')
      .text('\nScan to view or pay\n')
      .qr(ticket.paymentUrl)
      .text('\nTicket code\n')
      .bold()
      .doubleWidth()
      .text(`${asciiSafe(ticket.ticketCode)}\n`)
      .clearFormatting()
      .raw([0x0a, 0x0a, 0x0a])
      .write();
    return;
  }

  const characteristic = await ensureBrowserThermalPrinterConnected(locationId);
  await writeBrowserBytes(characteristic, await browserTicketBytes(ticket));
}

const TEST_QR_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="white"/><path fill="black" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0zM2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 1h2v2H9zM8 5h3v2H8zM12 8h2v3h-2zM8 9h2v2H8zM15 11h2v2h-2zM9 13h3v2H9zM13 15h2v3h-2zM17 17h2v2h-2zM7 18h3v2H7z"/></svg>',
)}`;

export async function printTestReceipt(locationName: string, locationId?: string | null): Promise<void> {
  await printEntryTicket(
    {
      sessionId: 'printer-test',
      plateNumber: 'TEST',
      vehicleType: 'Printer test',
      entryTime: new Date().toISOString(),
      ticketCode: 'PRINTER TEST',
      paymentUrl: 'https://pbp-parking.app',
      qrCodeDataUri: TEST_QR_DATA_URI,
      locationName,
    },
    locationId,
  );
}
