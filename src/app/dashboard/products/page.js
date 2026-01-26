"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AuthGate from "../../../components/AuthGate";
import ImageEditorModal from "../../../components/ImageEditorModal";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { resizeImages, formatFileSize } from "../../../utils/imageResize";

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
  const [processingImages, setProcessingImages] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    isService: false,
    duration: '',
<<<<<<< HEAD
    imageItems: []
=======
    images: [],
    existingImages: []  // Array of {id, url} objects for reordering support
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
  });
  const [imageEditor, setImageEditor] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "product-photo.jpg",
    targetId: null
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

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
<<<<<<< HEAD
      const existingItems = (product.images_data ||
        (product.images || []).map((url, i) => ({ id: `legacy_${i}`, url }))
      ).map((img) => ({
        id: img.id,
        url: img.url,
        isExisting: true,
        file: null
      }));
=======
      // Use imagesData if available (has id+url), fallback to images URLs
      const existingImgs = product.imagesData ||
        (product.images || []).map((url, i) => ({ id: `legacy_${i}`, url }));
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price ? (product.price / 100).toString() : '',
        isService: product.isService || false,
        duration: product.duration?.toString() || '',
<<<<<<< HEAD
        imageItems: existingItems
=======
        images: [],
        existingImages: existingImgs
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        isService: false,
        duration: '',
        imageItems: []
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const createImageItem = (file) => ({
    id: `new_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    url: URL.createObjectURL(file),
    file,
    isExisting: false
  });

  const openImageEditor = (item) => {
    setImageEditor({
      isOpen: true,
      imageSrc: item.url,
      fileName: item.file?.name || "product-photo.jpg",
      targetId: item.id
    });
  };

  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = productForm.imageItems;
    const oldIndex = current.findIndex((img) => img.id === active.id);
    const newIndex = current.findIndex((img) => img.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    setProductForm((prev) => ({
      ...prev,
      imageItems: arrayMove(current, oldIndex, newIndex)
    }));
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
      const existingItems = productForm.imageItems.filter((item) => item.isExisting);
      const newItems = productForm.imageItems.filter((item) => !item.isExisting);
      if (newItems.length > 0) {
        newItems.forEach((item) => {
          if (item.file) {
            formData.append('images[]', item.file);
          }
        });
      }

      // When editing, send the list of existing images to keep and their order
      if (editingProduct) {
<<<<<<< HEAD
        existingItems.forEach((item) => {
          const imageUrl = item.url;
          formData.append('keep_images[]', imageUrl);
=======
        const existingImages = productForm.existingImages || [];
        existingImages.forEach((img) => {
          formData.append('keep_images[]', img.url);
        });
        // Send the order of image IDs (existing images in their current order)
        existingImages.forEach((img) => {
          if (img.id && !img.id.startsWith('legacy_')) {
            formData.append('image_order[]', img.id);
          }
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
        });
        existingItems.forEach((item) => {
          if (item.id && !item.id.startsWith("legacy_")) {
            formData.append("image_order[]", item.id);
          }
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

  // Drag and drop handlers for reordering images
  const handleDragStart = (e, index, isNew) => {
    setDraggedIndex({ index, isNew });
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index, isNew) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex({ index, isNew });
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex, dropIsNew) => {
    e.preventDefault();
    if (!draggedIndex) return;

    const { index: dragIndex, isNew: dragIsNew } = draggedIndex;

    // Only allow reordering within the same category (existing or new)
    if (dragIsNew !== dropIsNew) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setProductForm(prev => {
      if (dragIsNew) {
        // Reorder new images
        const newImages = [...(prev.images || [])];
        const [removed] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, removed);
        return { ...prev, images: newImages };
      } else {
        // Reorder existing images
        const existingImages = [...(prev.existingImages || [])];
        const [removed] = existingImages.splice(dragIndex, 1);
        existingImages.splice(dropIndex, 0, removed);
        return { ...prev, existingImages: existingImages };
      }
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
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
                  <>
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
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Images</label>
<<<<<<< HEAD
                  {productForm.imageItems.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[var(--gray-500)] mb-2">Drag to reorder</p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleImageDragEnd}
                      >
                        <SortableContext items={productForm.imageItems.map((item) => item.id)} strategy={rectSortingStrategy}>
                          <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                            {productForm.imageItems.map((item) => (
                              <SortableProductImage
                                key={item.id}
                                id={item.id}
                                item={item}
                                onEdit={() => openImageEditor(item)}
                                onRemove={() =>
                                  setProductForm((prev) => ({
                                    ...prev,
                                    imageItems: prev.imageItems.filter((img) => img.id !== item.id)
                                  }))
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
=======
                  <p className="text-xs text-[var(--gray-500)] mb-3">Drag to reorder. First image is the primary photo.</p>

                  {/* Existing images */}
                  {productForm.existingImages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[var(--gray-500)] mb-2">Current images</p>
                      <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                        {productForm.existingImages.map((img, i) => (
                          <div
                            key={`existing-${img.id || i}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, i, false)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, i, false)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, i, false)}
                            className={`relative flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                              dragOverIndex?.index === i && !dragOverIndex?.isNew ? 'ring-2 ring-[var(--violet-500)] scale-110' : ''
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt="" className="w-16 h-16 rounded-lg object-cover pointer-events-none" />
                            {i === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5 rounded-b-lg">Primary</span>
                            )}
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
                          <div
                            key={`new-${i}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, i, true)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, i, true)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, i, true)}
                            className={`relative flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                              dragOverIndex?.index === i && dragOverIndex?.isNew ? 'ring-2 ring-[var(--violet-500)] scale-110' : ''
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-lg object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-[var(--violet-600)]/10 rounded-lg pointer-events-none" />
                            <span className="absolute top-0 left-0 bg-[var(--violet-600)] text-white text-[8px] px-1 py-0.5 rounded-tl-lg rounded-br-lg">New</span>
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
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        setProcessingImages(true);
                        try {
                          const totalOriginal = files.reduce((sum, f) => sum + f.size, 0);
                          const resizedFiles = await resizeImages(files);
                          const totalResized = resizedFiles.reduce((sum, f) => sum + f.size, 0);
                          if (totalResized < totalOriginal) {
                            console.log(`Product images resized: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalResized)}`);
                          }
<<<<<<< HEAD
                          setProductForm((prev) => ({
                            ...prev,
                            imageItems: [...prev.imageItems, ...resizedFiles.map(createImageItem)]
                          }));
                        } catch (err) {
                          console.error('Failed to resize images:', err);
                          setProductForm((prev) => ({
                            ...prev,
                            imageItems: [...prev.imageItems, ...files.map(createImageItem)]
=======
                          setProductForm(prev => ({
                            ...prev,
                            images: [...(prev.images || []), ...resizedFiles]
                          }));
                        } catch (err) {
                          console.error('Failed to resize images:', err);
                          setProductForm(prev => ({
                            ...prev,
                            images: [...(prev.images || []), ...files]
>>>>>>> a109316d0a5fd0af620d234c249604b45b6adde6
                          }));
                        } finally {
                          setProcessingImages(false);
                        }
                      }
                    }}
                    className="w-full text-sm text-[var(--gray-500)] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[var(--violet-50)] file:text-[var(--violet-600)]"
                  />
                </div>

                {processingImages && (
                  <div className="flex items-center gap-2 text-sm text-[var(--violet-600)]">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Optimizing images...</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn btn-outline flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || processingImages} className="btn btn-gradient flex-1">
                    {saving ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ImageEditorModal
        isOpen={imageEditor.isOpen}
        imageSrc={imageEditor.imageSrc}
        fileName={imageEditor.fileName}
        initialAspect={1}
        onClose={() => setImageEditor({ isOpen: false, imageSrc: null, fileName: "product-photo.jpg", targetId: null })}
        onSave={(editedFile) => {
          setProductForm((prev) => ({
            ...prev,
            imageItems: prev.imageItems.map((item) => {
              if (item.id !== imageEditor.targetId) return item;
              return {
                ...item,
                url: URL.createObjectURL(editedFile),
                file: editedFile,
                isExisting: false
              };
            })
          }));
        }}
      />
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
        {product.isService && (
          <div className="text-xs text-[var(--gray-500)] space-y-0.5">
            {product.duration && <p>{product.duration} min</p>}
          </div>
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

function SortableProductImage({ id, item, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
      {!item.isExisting && (
        <span className="absolute top-1 left-1 badge bg-[var(--violet-600)] text-white text-[10px]">New</span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6m2.828 2.828l-6 6M7 17l-2 2 2-2z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.();
        }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--error)] text-white flex items-center justify-center"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

