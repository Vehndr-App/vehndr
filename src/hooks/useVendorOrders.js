import { useEffect, useRef } from 'react';
import { createConsumer } from '@rails/actioncable';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useVendorOrders(vendorId, onNewOrder) {
  const cableRef = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!vendorId) return;

    const token = typeof window !== 'undefined' 
      ? window.localStorage?.getItem('vehndr_token') 
      : null;

    if (!token) return;

    // Create WebSocket connection with authentication
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/cable?token=${token}`;
    cableRef.current = createConsumer(wsUrl);

    // Subscribe to the VendorOrdersChannel
    subscriptionRef.current = cableRef.current.subscriptions.create(
      { channel: 'VendorOrdersChannel' },
      {
        connected() {
          console.log('Connected to VendorOrdersChannel');
        },
        disconnected() {
          console.log('Disconnected from VendorOrdersChannel');
        },
        received(data) {
          console.log('Received order update:', data);
          if (data.event === 'order.created' && onNewOrder) {
            onNewOrder(data.order);
          }
        }
      }
    );

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (cableRef.current) {
        cableRef.current.disconnect();
      }
    };
  }, [vendorId, onNewOrder]);

  return null;
}

















