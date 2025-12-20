"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function ProductsPage() {
  return (
    <AuthGate>
      <ProductsInner />
    </AuthGate>
  );
}

function ProductsInner() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    isService: false,
    duration: '',
    images: [],
    existingImages: []
  });

  const fetchProducts = useCallback(async (vendorId) => {
    try {
      const response = await api(`/api/vendors/${vendorId}/products`);
      if (Array.isArray(response)) {
        setProducts(response);
      } else if (response && Array.isArray(response.products)) {
        setProducts(response.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.vendorId) {
        await fetchProducts(u.vendorId);
      }
      setLoading(false);
    })();
  }, [fetchProducts]);

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price ? (product.price / 100).toString() : '',
        isService: product.isService || false,
        duration: product.duration?.toString() || '',
        images: [],
        existingImages: product.images || []
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        isService: false,
        duration: '',
        images: [],
        existingImages: []
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('product[name]', productForm.name);
      formData.append('product[description]', productForm.description);
      formData.append('product[price]', Math.round(parseFloat(productForm.price) * 100));
      formData.append('product[is_service]', productForm.isService);
      if (productForm.isService && productForm.duration) {
        formData.append('product[duration]', productForm.duration);
      }

      // Add new images
      if (productForm.images && productForm.images.length > 0) {
        productForm.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      // When editing, send the list of existing images to keep
      if (editingProduct) {
        productForm.existingImages.forEach((imageUrl) => {
          formData.append('keep_images[]', imageUrl);
        });
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      await api(url, { method, body: formData });

      setSuccessMessage(editingProduct ? 'Product updated!' : 'Product created!');
      setTimeout(() => setSuccessMessage(null), 3000);

      if (user?.vendorId) {
        await fetchProducts(user.vendorId);
      }

      closeModal();
    } catch (err) {
      console.error('Failed to save product', err);
      alert(`Failed to save product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product?')) return;

    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' });
      setSuccessMessage('Product deleted!');
      setTimeout(() => setSuccessMessage(null), 3000);

      if (user?.vendorId) {
        await fetchProducts(user.vendorId);
      }
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center pb-20">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-[var(--success)] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-h2">Items & Services</h1>
            </div>
            <button
              onClick={() => openModal()}
              className="btn bg-[var(--violet-600)] text-white rounded-full h-10 px-4 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          {products.length === 0 ? (
            <div className="card bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--violet-50)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-h4 text-[var(--gray-700)] mb-2">No products yet</h3>
              <p className="text-sm text-[var(--gray-500)] mb-4">Add your first product or service to start selling</p>
              <button
                onClick={() => openModal()}
                className="btn btn-gradient"
              >
                Add Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => openModal(product)}
                  onDelete={() => handleDelete(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 overlay" onClick={closeModal} />
          <div className="relative bg-white bottom-sheet sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom">
            <div className="p-6">
              <div className="bottom-sheet-handle sm:hidden" />
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-h3">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={closeModal} className="w-8 h-8 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, isService: false, duration: '' })}
                    className={`flex-1 chip ${!productForm.isService ? 'chip-active' : 'chip-filled'}`}
                  >
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, isService: true })}
                    className={`flex-1 chip ${productForm.isService ? 'chip-active' : 'chip-filled'}`}
                  >
                    Service
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="input"
                    placeholder="Product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Description</label>
                  <textarea
                    required
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                    className="input h-auto py-3"
                    placeholder="Describe your product"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>

                {productForm.isService && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.duration}
                      onChange={(e) => setProductForm({ ...productForm, duration: e.target.value })}
                      className="input"
                      placeholder="60"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Images</label>

                  {/* Existing images */}
                  {productForm.existingImages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[var(--gray-500)] mb-2">Current images</p>
                      <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                        {productForm.existingImages.map((imageUrl, i) => (
                          <div key={i} className="relative flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                            <button
                              type="button"
                              onClick={() => setProductForm({
                                ...productForm,
                                existingImages: productForm.existingImages.filter((_, idx) => idx !== i)
                              })}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--error)] text-white flex items-center justify-center"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New images preview */}
                  {productForm.images.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[var(--gray-500)] mb-2">New images to add</p>
                      <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                        {Array.from(productForm.images).map((file, i) => (
                          <div key={i} className="relative flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                            <button
                              type="button"
                              onClick={() => setProductForm({ ...productForm, images: Array.from(productForm.images).filter((_, idx) => idx !== i) })}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--error)] text-white flex items-center justify-center"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setProductForm({ ...productForm, images: Array.from(e.target.files) })}
                    className="w-full text-sm text-[var(--gray-500)] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[var(--violet-50)] file:text-[var(--violet-600)]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn btn-outline flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-gradient flex-1">
                    {saving ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  const images = product.images || [];
  const price = (product.price || 0) / 100;

  return (
    <div className="card bg-white overflow-hidden">
      {images.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0]}
          alt={product.name}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-[var(--gray-100)] flex items-center justify-center">
          <svg className="w-12 h-12 text-[var(--gray-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
          {product.isService && (
            <span className="chip text-[10px] px-1.5 py-0.5 bg-[var(--magenta-500)]/10 text-[var(--magenta-600)] flex-shrink-0">
              Service
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-[var(--foreground)]">${price.toFixed(2)}</p>
        {product.isService && product.duration && (
          <p className="text-xs text-[var(--gray-500)]">{product.duration} min</p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onEdit}
            className="flex-1 chip chip-outlined text-xs justify-center"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="chip text-xs bg-[var(--error)]/10 text-[var(--error)] px-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

