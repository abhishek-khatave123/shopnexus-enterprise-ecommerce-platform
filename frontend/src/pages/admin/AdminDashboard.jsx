import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { adminService } from '../../services/adminService'
import StatCard from '../../components/admin/StatCard'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [ordersBreakdown, setOrdersBreakdown] = useState({ by_status: [] });
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [ov, rev, ord, prod, orders] = await Promise.all([
          adminService.overview(),
          adminService.revenue('30d', 'day'),
          adminService.ordersBreakdown(),
          adminService.productsAnalytics(),
          adminService.listOrders({}),
        ]);
        if (!mounted) return;
        setOverview(ov);
        setRevenue(rev);
        setOrdersBreakdown(ord);
        setTopProducts(prod.top_products || []);
        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Revenue" value={`₹${Number(overview.total_revenue).toLocaleString('en-IN')}`} accent="green" />
        <StatCard label="Total Orders" value={overview.total_orders} />
        <StatCard label="Total Customers" value={overview.total_customers} />
        <StatCard label="Total Products" value={overview.total_products} />
        <StatCard label="Pending Orders" value={overview.pending_orders} accent="yellow" />
        <StatCard label="Low Stock Products" value={overview.low_stock_products} accent="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ordersBreakdown.by_status}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-brand-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map((o) => (
              <div key={o.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-gray-700">{o.order_number}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.order_status] || 'bg-gray-100'}`}>
                  {o.order_status}
                </span>
                <span className="font-medium text-gray-900">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-gray-400 py-4">No orders yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Selling Products</h2>
            <Link to="/admin/analytics" className="text-sm text-brand-600 hover:underline">View analytics →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((p) => (
              <div key={p.product_id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{p.product_name}</span>
                <span className="text-gray-500">{p.units_sold} sold</span>
                <span className="font-medium text-gray-900">₹{Number(p.revenue).toLocaleString('en-IN')}</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-gray-400 py-4">No sales data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
