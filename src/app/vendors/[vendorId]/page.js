"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../services/vendors";
import Link from "next/link";

export default function VendorProfilePage() {
  const { vendorId } = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [v, p] = await Promise.all([
          getVendorProfile(vendorId),
          getVendorProducts(vendorId)
        ]);
        setVendor(v);
        setProducts(p || []);
      } catch (error) {
        console.error('Failed to load vendor:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  if (loading || !vendor) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-black/60">
        Loading vendor…
      </div>
    );
  }

  const services = products.filter(p => p.isService);
  const regularProducts = products.filter(p => !p.isService);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Vendor Header */}
      <div className="flex items-start gap-6 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vendor.heroImage}
          alt=""
          className="h-24 w-24 rounded-lg bg-black/[.04] object-cover"
        />
        <div>
          <h1 className="text-2xl font-semibold">{vendor.name}</h1>
          <p className="text-sm text-black/60">{vendor.description}</p>
          <div className="text-xs mt-2 text-black/50">
            {vendor.location} • {vendor.rating}★
          </div>
        </div>
      </div>

      {/* Services Section */}
      {services.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/store/${vendorId}/products/${service.id}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    {service.duration} min
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {service.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-violet-600">
                    ${(service.price / 100).toFixed(2)}
                  </span>
                  {service.availableTimeSlots && service.availableTimeSlots.length > 0 ? (
                    <span className="text-xs text-green-600 font-medium">
                      {service.availableTimeSlots.length} slots available
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      No slots available
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      {regularProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularProducts.map((product) => (
              <Link
                key={product.id}
                href={`/store/${vendorId}/products/${product.id}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200"
              >
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
                <span className="text-lg font-bold text-violet-600">
                  ${(product.price / 100).toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>This vendor hasn't added any products or services yet.</p>
        </div>
      )}
    </div>
  );
}


