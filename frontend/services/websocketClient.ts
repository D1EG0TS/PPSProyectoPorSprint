import { Platform } from 'react-native';

// Status types
export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

type MessageHandler = (data: any) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class StockWebSocketClient {
  private static instance: StockWebSocketClient | null = null;
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<StatusHandler> = new Set();
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private userId: number;
  
  // To avoid rapid state updates
  private processQueue: any[] = [];
  private processingInterval: any = null;

  private constructor(userId: number) {
    this.userId = userId;
    this.url = this.getWsUrl(userId);
    this.connect();
    // Start processing loop for throttling updates
    this.startProcessingLoop();
  }

  public static getInstance(userId: number): StockWebSocketClient {
    if (!StockWebSocketClient.instance) {
      StockWebSocketClient.instance = new StockWebSocketClient(userId);
    } else if (StockWebSocketClient.instance.userId !== userId) {
        StockWebSocketClient.instance.close();
        StockWebSocketClient.instance = new StockWebSocketClient(userId);
    }
    return StockWebSocketClient.instance;
  }

  private getWsUrl(userId: number) {
    // Use env variable if available
    if (process.env.EXPO_PUBLIC_API_URL) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const wsUrl = apiUrl.replace(/^http/, 'ws');
      return `${wsUrl}/ws/${userId}`;
    }

    const host = Platform.OS === 'android' ? '10.0.2.2:8000' : 'localhost:8000';
    return `ws://${host}/ws/${userId}`;
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public addStatusListener(listener: StatusHandler) {
    this.statusListeners.add(listener);
    // Immediately notify current status
    listener(this.status);
  }

  public removeStatusListener(listener: StatusHandler) {
    this.statusListeners.delete(listener);
  }

  private connect() {
    console.log(`[WS] Connecting to ${this.url}`);
    this.setStatus(ConnectionStatus.CONNECTING);
    
    try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.setStatus(ConnectionStatus.CONNECTED);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            // Push to queue for throttled processing
            this.processQueue.push(message);
          } catch (e) {
            console.error('[WS] Error parsing message', e);
          }
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected');
          this.setStatus(ConnectionStatus.DISCONNECTED);
          if (this.shouldReconnect) {
            setTimeout(() => this.connect(), this.reconnectInterval);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error', error);
          this.setStatus(ConnectionStatus.ERROR);
          // Close will trigger onclose
        };
    } catch (e) {
        console.error('[WS] Connection Failed', e);
        this.setStatus(ConnectionStatus.ERROR);
        if (this.shouldReconnect) {
             setTimeout(() => this.connect(), this.reconnectInterval);
        }
    }
  }

  private startProcessingLoop() {
      // Process messages every 200ms (Throttle)
      // This batches updates to avoid UI freezing
      this.processingInterval = setInterval(() => {
          if (this.processQueue.length === 0) return;
          
          // Process all queued messages
          // Optimization: If multiple updates for same product, keep only latest?
          // For now, just process all in order to ensure no event loss
          const batch = [...this.processQueue];
          this.processQueue = []; // Clear queue
          
          batch.forEach(msg => this.handleMessage(msg));
          
      }, 200); 
  }

  private handleMessage(message: any) {
    if (message.type && this.listeners.has(message.type)) {
      this.listeners.get(message.type)?.forEach(callback => callback(message.data));
    }
    
    if (this.listeners.has('*')) {
        this.listeners.get('*')?.forEach(callback => callback(message));
    }
  }

  public subscribe(type: string, callback: MessageHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(callback);
  }

  public unsubscribe(type: string, callback: MessageHandler) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.delete(callback);
    }
  }

  public close() {
    this.shouldReconnect = false;
    this.ws?.close();
    if (this.processingInterval) clearInterval(this.processingInterval);
    this.listeners.clear();
    this.statusListeners.clear();
    StockWebSocketClient.instance = null;
  }
}

export const getWebSocketClient = (userId: number) => StockWebSocketClient.getInstance(userId);
