"use client";

import AuthGate from "../../components/AuthGate";
import { getCurrentUser } from "../../services/auth";
import { api } from "../../services/api";
import { useEffect, useState, useCallback } from "react";
import { useVendorOrders } from "../../hooks/useVendorOrders";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async (vendorId) => {
    try {
      const vendorOrders = await api(`/api/vendors/${vendorId}/orders`);
      setOrders(vendorOrders);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      
      if (u?.vendorId) {
        await fetchOrders(u.vendorId);
      }
      setLoading(false);
    })();
  }, [fetchOrders]);

  // Real-time order updates via ActionCable
  const handleNewOrder = useCallback((newOrder) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    
    // Optional: Show a notification toast
    console.log('New order received:', newOrder);
  }, []);

  useVendorOrders(user?.vendorId, handleNewOrder);

  return (
    <div className="mx-auto max-w-5xl p-6 w-full min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Vendor Dashboard</h1>
      {user && (
        <div className="text-sm text-black/60 mb-8">
          Signed in as <span className="font-medium text-black">{user.name}</span>
          <br/>
          Vendor ID: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{user.vendorId}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <div className="text-sm text-gray-500">{orders.length} orders</div>
          </div>
          
          {loading ? (
            <div className="text-sm text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-lg">No orders yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-600">#{order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        {new Date(order.created_at || order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${(order.total_cents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm opacity-60">
          <div className="font-medium mb-2">Product Management</div>
          <div className="text-sm text-black/60">Coming soon. You will be able to add and edit products here.</div>
        </div>
      </div>
    </div>
  );
}
