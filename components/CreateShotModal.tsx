// aalvar-app/components/CreateShotModal.tsx

"use client";

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

type UploadMethod = 'url' | 'file' | 'camera' | 'bulk';

interface BulkUploadProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

export default function CreateShotModal({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Bulk upload states
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<BulkUploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Success animation and redirect
  const showSuccessAndRedirect = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
      // Redirect to Mis Shots page
      window.location.href = '/mis-shots';
    }, 1500);
  };

  // Image resizing function - updated to 1600x900
  const resizeImage = (file: File, maxWidth: number = 1600, maxHeight: number = 900, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = img;
        
        // Check if image needs resizing
        if (width <= maxWidth && height <= maxHeight) {
          resolve(file); // Return original file if it's already small enough
          return;
        }
        
        // Calculate new dimensions maintaining aspect ratio
        let newWidth = width;
        let newHeight = height;
        
        if (width > maxWidth) {
          newWidth = maxWidth;
          newHeight = (height * maxWidth) / width;
        }
        
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = (width * maxHeight) / height;
        }
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file); // Fallback to original file
          }
        }, file.type, quality);
      };
      
      img.onerror = () => {
        resolve(file); // Fallback to original file on error
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Resize image if needed
      const processedFile = await resizeImage(file);
      const filePath = `${user.id}/${Date.now()}-${processedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('shots')
        .upload(filePath, processedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('shots')
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Bulk upload functions
  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setBulkFiles(imageFiles);
    setError(null);
  };

  const getFileNameWithoutExtension = (fileName: string) => {
    return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
  };

  const handleBulkUpload = async () => {
    if (!user || bulkFiles.length === 0) return;

    setLoading(true);
    setBulkProgress({
      total: bulkFiles.length,
      completed: 0,
      current: '',
      errors: []
    });

    const errors: string[] = [];

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const fileName = getFileNameWithoutExtension(file.name);
      
      setBulkProgress(prev => prev ? {
        ...prev,
        current: fileName,
        completed: i
      } : null);

      try {
        // Resize image if needed
        const processedFile = await resizeImage(file);
        const filePath = `${user.id}/${Date.now()}-${processedFile.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('shots')
          .upload(filePath, processedFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage
          .from('shots')
          .getPublicUrl(filePath);

        // Insert into database
        const { error: insertError } = await supabase
          .from('shots')
          .insert({
            user_id: user.id,
            title: fileName,
            description: `Subido desde importación masiva`,
            image_url: data.publicUrl,
          });

        if (insertError) {
          throw insertError;
        }

      } catch (err: any) {
        errors.push(`${fileName}: ${err.message}`);
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setBulkProgress(prev => prev ? {
      ...prev,
      completed: bulkFiles.length,
      current: 'Completado',
      errors
    } : null);

    setLoading(false);

    if (errors.length === 0) {
      showSuccessAndRedirect();
    } else {
      setError(`Se completaron ${bulkFiles.length - errors.length} de ${bulkFiles.length} shots. Errores: ${errors.join(', ')}`);
    }
  };

  // Enhanced drag and drop handlers - now for all upload methods
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processDataTransferItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file((file: File) => {
            if (file.type.startsWith('image/')) {
              files.push(file);
            }
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        
        return new Promise((resolve) => {
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
                return;
              }
              
              for (const childEntry of entries) {
                await processEntry(childEntry);
              }
              
              // Continue reading (directories might have more entries)
              readEntries();
            });
          };
          readEntries();
        });
      }
    };

    // Process all items
    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(processEntry(entry));
        }
      }
    }

    await Promise.all(promises);
    return files;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setLoading(true);
    setError(null);
    
    try {
      let imageFiles: File[] = [];
      
      // Check if we have DataTransferItems (supports folders)
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        imageFiles = await processDataTransferItems(e.dataTransfer.items);
      } else {
        // Fallback to regular files
        const files = Array.from(e.dataTransfer.files);
        imageFiles = files.filter(file => file.type.startsWith('image/'));
      }
      
      if (imageFiles.length > 0) {
        // If only one image, handle as single upload for file/camera methods
        if (imageFiles.length === 1 && (uploadMethod === 'file' || uploadMethod === 'camera')) {
          await handleFileUpload(imageFiles[0]);
        } else {
          // Multiple images or bulk mode - switch to bulk
          setBulkFiles(imageFiles);
          setUploadMethod('bulk');
        }
        setError(null);
      } else {
        setError('No se encontraron imágenes en los archivos o carpetas arrastrados.');
      }
    } catch (err: any) {
      setError('Error al procesar los archivos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [uploadMethod, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageUrl) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('shots')
        .insert({
          user_id: user.id,
          title: title,
          description: description,
          image_url: imageUrl,
        });

      if (insertError) {
        throw insertError;
      }

      showSuccessAndRedirect();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success checkmark component
  const SuccessCheckmark = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <div className="animate-bounce">
          <div className="text-6xl text-green-400 mb-4">✓</div>
        </div>
        <p className="text-white text-lg font-semibold">¡Shot(s) creado(s) con éxito!</p>
        <p className="text-gray-400 text-sm mt-2">Redirigiendo a Mis Shots...</p>
      </div>
    </div>
  );

  if (showSuccess) {
    return <SuccessCheckmark />;
  }

  return (
    <div className={embedded ? "" : "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"}>
      <div className={embedded ? "bg-gray-900 rounded-lg w-full p-6" : "bg-gray-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Crear un Shot</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        {/* Selector de Método de Subida */}
        <div className="flex justify-center space-x-2 mb-6">
          <button
            type="button"
            onClick={() => setUploadMethod('url')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${uploadMethod === 'url' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setUploadMethod('file')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${uploadMethod === 'file' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}
          >
            Archivo
          </button>
          <button
            type="button"
            onClick={() => setUploadMethod('camera')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${uploadMethod === 'camera' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}
          >
            Cámara
          </button>
          <button
            type="button"
            onClick={() => setUploadMethod('bulk')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${uploadMethod === 'bulk' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}
          >
            📁 Importar Múltiples
          </button>
        </div>

        {/* Bulk Upload Section */}
        {uploadMethod === 'bulk' && (
          <div className="space-y-4 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Importación Masiva de Imágenes</h3>
              <p className="text-gray-400 text-sm mb-2">
                Selecciona múltiples imágenes o arrastra carpetas completas aquí. Los nombres de archivo se usarán como títulos.
              </p>
              <p className="text-[#D4AF37] text-xs mb-4">
                🔧 Las imágenes mayores a 1600x900px se redimensionarán automáticamente para optimizar el rendimiento
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                  : 'border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="space-y-4">
                <div className="text-4xl">📁</div>
                <div>
                  <p className="text-white font-medium">
                    Arrastra carpetas o imágenes aquí
                  </p>
                  <p className="text-gray-400 text-sm">
                    o haz clic para seleccionar archivos
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    ✅ Soporta carpetas completas con subcarpetas
                  </p>
                  <p className="text-[#D4AF37] text-xs">
                    🎯 Optimización automática de imágenes grandes
                  </p>
                </div>
                <input
                  ref={bulkInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bulkInputRef.current?.click()}
                  disabled={loading}
                  className="bg-[#D4AF37] text-black px-4 py-2 font-semibold rounded-md hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Procesando...' : 'Seleccionar Imágenes'}
                </button>
              </div>
            </div>

            {/* Selected Files Preview */}
            {bulkFiles.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">
                  {bulkFiles.length} imagen(es) seleccionada(s):
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {bulkFiles.map((file, index) => (
                    <div key={index} className="text-sm text-gray-300 flex justify-between">
                      <span>📷 {getFileNameWithoutExtension(file.name)}</span>
                      <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleBulkUpload}
                  disabled={loading}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Subiendo y Optimizando...' : `Crear ${bulkFiles.length} Shots`}
                </button>
              </div>
            )}

            {/* Progress Indicator */}
            {bulkProgress && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Progreso: {bulkProgress.completed}/{bulkProgress.total}</span>
                  <span>{Math.round((bulkProgress.completed / bulkProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-[#D4AF37] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400">
                  {bulkProgress.completed < bulkProgress.total 
                    ? `Procesando y optimizando: ${bulkProgress.current}...`
                    : 'Completado!'
                  }
                </p>
                {bulkProgress.errors.length > 0 && (
                  <div className="mt-2 text-red-400 text-sm">
                    <p>Errores:</p>
                    <ul className="list-disc list-inside">
                      {bulkProgress.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Single Upload Form */}
        {uploadMethod !== 'bulk' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input dinámico según el método */}
            {uploadMethod === 'url' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`transition-colors ${isDragOver ? 'bg-[#D4AF37]/10' : ''}`}
              >
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300">URL de la Imagen</label>
                <p className="text-[#D4AF37] text-xs mb-2">
                  💡 También puedes arrastrar imágenes aquí
                </p>
                <input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className={`mt-1 block w-full px-3 py-2 bg-gray-800 border rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white ${
                    isDragOver ? 'border-[#D4AF37]' : 'border-gray-600'
                  }`}
                />
              </div>
            )}

            {(uploadMethod === 'file' || uploadMethod === 'camera') && (
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {uploadMethod === 'camera' ? 'Tomar Foto' : 'Subir Archivo'}
                </label>
                <p className="text-[#D4AF37] text-xs mb-2">
                  🔧 Las imágenes mayores a 1600x900px se redimensionarán automáticamente
                </p>
                <p className="text-green-400 text-xs mb-2">
                  💡 También puedes arrastrar imágenes aquí
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={uploadMethod === 'camera' ? "image/*;capture=camera" : "image/*"}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mt-1 block w-full px-3 py-2 border-2 border-dashed rounded-md cursor-pointer bg-gray-800 transition-colors ${
                    isDragOver 
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center text-gray-400">
                    {loading ? 'Subiendo y Optimizando...' : 
                     isDragOver ? '📁 Suelta la imagen aquí' : 
                     '📷 Seleccionar Archivo o Arrastrar Imagen'}
                  </div>
                </div>
                {imageUrl && <p className="text-xs text-green-400 mt-1">Imagen subida y optimizada correctamente.</p>}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descripción</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] text-white"
              />
            </div>
            
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !imageUrl}
              className="w-full bg-white text-black py-2 px-4 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creando...' : 'Crear Shot'}
            </button>
          </form>
        )}

        {/* Error Display for Bulk Upload */}
        {uploadMethod === 'bulk' && error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
