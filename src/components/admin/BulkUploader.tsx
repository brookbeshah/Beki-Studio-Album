import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Link,
  Film,
  Image as ImageIcon,
  Plus,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import { AlbumSection } from '../../types';
import {
  uploadMediaFile,
  addMediaFromUrl,
  validateImageUrl,
  CompressionDiagnostic,
} from '../../services/mediaService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/LanguageContext';

interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'PHOTO' | 'VIDEO';
  progress: number;
  bytesTransferred: number;
  status: 'WAITING' | 'PREPARING' | 'COMPRESSING' | 'UPLOADING' | 'SAVING' | 'COMPLETE' | 'FAILED';
  previewUrl?: string;
  errorMessage?: string;
  storageUrl?: string;
  mediaId?: string;
  diagnostic?: CompressionDiagnostic;
}

interface BulkUploaderProps {
  albumId: string;
  sections?: AlbumSection[];
  onUploadFinished?: () => void;
}

export const BulkUploader: React.FC<BulkUploaderProps> = ({
  albumId,
  sections = [],
  onUploadFinished,
}) => {
  const { adminProfile, user } = useAuth();
  const { success, error, info } = useToast();
  const { t } = useI18n();

  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  // File Upload State
  const [queue, setQueue] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  // URL Upload State
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [urlAltText, setUrlAltText] = useState('');
  const [urlSectionId, setUrlSectionId] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [urlPreviewValid, setUrlPreviewValid] = useState<boolean | null>(null);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  // ----------------------------------------------------
  // FILE UPLOAD HANDLERS
  // ----------------------------------------------------
  const handleFiles = (fileList: FileList | File[]) => {
    const newItems: UploadFileItem[] = [];

    Array.from(fileList).forEach((file) => {
      const isValidType =
        allowedTypes.includes(file.type) ||
        !!file.name.match(/\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i);

      if (!isValidType) {
        return;
      }

      if (queue.some((item) => item.name === file.name && item.size === file.size)) {
        return;
      }

      const isVideo = file.type.startsWith('video') || !!file.name.match(/\.(mp4|mov|webm)$/i);
      const id = 'upl_' + Math.random().toString(36).substring(2, 9);

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: isVideo ? 'VIDEO' : 'PHOTO',
        progress: 0,
        bytesTransferred: 0,
        status: 'WAITING',
        previewUrl: isVideo ? undefined : URL.createObjectURL(file),
      });
    });

    if (newItems.length === 0) {
      error('No supported photos or videos selected (JPEG, PNG, WebP, MP4, MOV, WebM).');
      return;
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const uploadSingleItem = async (
    item: UploadFileItem,
    actor: { id: string; name: string; email: string }
  ) => {
    setQueue((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'PREPARING', progress: 5 } : it))
    );

    try {
      await uploadMediaFile(albumId, item.file, {
        sectionId: selectedSectionId,
        actor,
        existingStorageUrl: item.storageUrl,
        existingMediaId: item.mediaId,
        onStageChange: (stage) => {
          setQueue((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, status: stage } : it))
          );
        },
        onDiagnostic: (diagnostic) => {
          setQueue((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, diagnostic } : it))
          );
        },
        onProgress: (percent, bytesTransferred) => {
          setQueue((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, progress: percent, bytesTransferred } : it
            )
          );
        },
      });

      setQueue((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'COMPLETE', progress: 100 } : it
        )
      );
      return true;
    } catch (err: any) {
      console.error('[Upload Failed]', item.name, err);
      const storageUrl = err?.storageUrl || item.storageUrl;
      const mediaId = err?.mediaId || item.mediaId;
      setQueue((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'FAILED',
                storageUrl,
                mediaId,
                errorMessage: err?.message || 'Storage upload error',
              }
            : it
        )
      );
      return false;
    }
  };

  const startUpload = async () => {
    if (!albumId || queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    abortControllerRef.current = false;

    const actor = {
      id: user?.uid || adminProfile?.id || 'admin',
      name: adminProfile?.name || 'Administrator',
      email: adminProfile?.email || 'admin@bekisstudio.com',
    };

    const pendingItems = queue.filter(
      (item) => item.status === 'WAITING' || item.status === 'FAILED'
    );

    let completedCount = 0;
    let nextIndex = 0;
    const concurrency = 3; // Tuned for high throughput without saturating browser network

    const worker = async () => {
      while (nextIndex < pendingItems.length) {
        if (abortControllerRef.current) break;
        const current = pendingItems[nextIndex++];
        const ok = await uploadSingleItem(current, actor);
        if (ok) completedCount++;
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, pendingItems.length) },
      () => worker()
    );
    await Promise.all(workers);

    setIsProcessing(false);

    if (completedCount > 0) {
      success(`Successfully uploaded ${completedCount} media files!`);
      if (onUploadFinished) {
        onUploadFinished();
      }
    }
  };

  const retryItem = async (itemId: string) => {
    const item = queue.find((it) => it.id === itemId);
    if (!item) return;

    const actor = {
      id: user?.uid || adminProfile?.id || 'admin',
      name: adminProfile?.name || 'Administrator',
      email: adminProfile?.email || 'admin@bekisstudio.com',
    };

    await uploadSingleItem(item, actor);
    if (onUploadFinished) {
      onUploadFinished();
    }
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => {
      prev.forEach((i) => {
        if (i.status === 'COMPLETE' && i.previewUrl) {
          URL.revokeObjectURL(i.previewUrl);
        }
      });
      return prev.filter((i) => i.status !== 'COMPLETE');
    });
  };

  const cancelUpload = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    info('Upload sequence paused.');
  };

  // ----------------------------------------------------
  // IMAGE URL HANDLERS
  // ----------------------------------------------------
  const handleUrlInputChange = (val: string) => {
    setImageUrlInput(val);
    const validation = validateImageUrl(val);
    if (!val.trim()) {
      setUrlPreviewValid(null);
    } else {
      setUrlPreviewValid(validation.valid);
    }
  };

  const handleAddMediaFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim() || isAddingUrl) return;

    setIsAddingUrl(true);
    const actor = {
      id: user?.uid || adminProfile?.id || 'admin',
      name: adminProfile?.name || 'Administrator',
      email: adminProfile?.email || 'admin@bekisstudio.com',
    };

    try {
      // Support multiple URLs separated by newline or comma
      const rawUrls = imageUrlInput
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      if (rawUrls.length === 0) {
        error('Please enter at least one valid image URL');
        setIsAddingUrl(false);
        return;
      }

      let addedCount = 0;
      for (const url of rawUrls) {
        await addMediaFromUrl({
          albumId,
          url,
          altText: urlAltText.trim(),
          sectionId: urlSectionId || selectedSectionId,
          actor,
        });
        addedCount++;
      }

      success(
        addedCount === 1
          ? 'Image added to album gallery from URL!'
          : `Added ${addedCount} images to album gallery from URLs!`
      );

      setImageUrlInput('');
      setUrlAltText('');
      setUrlPreviewValid(null);

      if (onUploadFinished) {
        onUploadFinished();
      }
    } catch (err: any) {
      error(err.message || 'Failed to add image from URL');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const totalFiles = queue.length;
  const completedFiles = queue.filter((i) => i.status === 'COMPLETE').length;
  const failedFiles = queue.filter((i) => i.status === 'FAILED').length;
  const pendingFiles = queue.filter(
    (i) => i.status === 'WAITING' || i.status === 'UPLOADING'
  ).length;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Method Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E0D0] pb-2">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            uploadMode === 'file'
              ? 'bg-[#171717] text-[#F8F6F0] shadow-xs'
              : 'bg-[#FCFBF8] text-[#77736B] hover:text-[#171717] border border-[#E8E0D0]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Files from Computer</span>
        </button>

        <button
          type="button"
          onClick={() => setUploadMode('url')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
            uploadMode === 'url'
              ? 'bg-[#171717] text-[#F8F6F0] shadow-xs'
              : 'bg-[#FCFBF8] text-[#77736B] hover:text-[#171717] border border-[#E8E0D0]'
          }`}
        >
          <Link className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Use Image URL (Fast &amp; Instant)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: FILE UPLOADER */}
      {/* ========================================================================= */}
      {uploadMode === 'file' && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xs p-8 sm:p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#C8A96B] bg-[#C8A96B]/5 scale-[0.99]'
                : 'border-[#E8E0D0] hover:border-[#C8A96B] bg-[#FCFBF8]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div className="w-14 h-14 rounded-full bg-[#F8F6F0] text-[#C8A96B] flex items-center justify-center mx-auto mb-4 border border-[#E8E0D0] shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3
              className="font-serif text-xl sm:text-2xl text-[#171717] font-normal mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Select or Drag High-Resolution Memories
            </h3>

            <p className="text-xs text-[#77736B] font-light max-w-md mx-auto mb-4">
              Upload photos (JPEG, PNG, WebP) and video reels (MP4, MOV).
              Parallel, non-blocking upload queue with real progress tracking.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-[#F8F6F0] text-xs uppercase tracking-widest rounded-xs hover:bg-[#2A2826] transition-colors shadow-2xs">
              Browse Computer
            </div>
          </div>

          {/* Upload Queue Settings Bar */}
          {queue.length > 0 && (
            <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-[#77736B]">Queue: </span>
                  <span className="font-semibold text-[#171717]">
                    {completedFiles} / {totalFiles} Completed
                  </span>
                </div>
                {failedFiles > 0 && (
                  <span className="text-red-700 font-medium">({failedFiles} Failed)</span>
                )}

                {/* Optional Section Assignment */}
                {sections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#77736B]">Assign to Section:</span>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                    >
                      <option value="">No Section (All Memories)</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <Button variant="outline" size="sm" onClick={cancelUpload}>
                    Pause Upload
                  </Button>
                ) : (
                  <>
                    {completedFiles > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearCompleted}>
                        Clear Finished
                      </Button>
                    )}
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={startUpload}
                      disabled={pendingFiles === 0}
                    >
                      {pendingFiles === 0 ? 'All Uploaded' : `Upload ${pendingFiles} Files`}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Queue List Cards */}
          {queue.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E8E0D0] p-3 rounded-xs flex items-center justify-between gap-4 shadow-2xs hover:border-[#C8A96B] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail Preview */}
                    <div className="w-12 h-12 bg-[#EFECE4] rounded-2xs overflow-hidden shrink-0 flex items-center justify-center border border-[#E8E0D0]">
                      {item.type === 'VIDEO' ? (
                        <Film className="w-5 h-5 text-[#C8A96B]" />
                      ) : item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#77736B]" />
                      )}
                    </div>

                    {/* Metadata & Progress */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-[#171717] truncate">{item.name}</p>
                        <span className="text-[10px] text-[#77736B] font-mono shrink-0 ml-2">
                          {formatFileSize(item.size)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#EFECE4] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.status === 'COMPLETE'
                              ? 'bg-emerald-600'
                              : item.status === 'FAILED'
                              ? 'bg-red-600'
                              : 'bg-[#C8A96B]'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      {/* Status indicator line */}
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span
                          className={
                            item.status === 'COMPLETE'
                              ? 'text-emerald-700 font-medium'
                              : item.status === 'FAILED'
                              ? 'text-red-700 font-medium'
                              : 'text-[#77736B]'
                          }
                        >
                          {item.status === 'WAITING' && 'Waiting in queue...'}
                          {item.status === 'PREPARING' && 'Preparing file...'}
                          {item.status === 'COMPRESSING' && (
                            <span className="inline-flex items-center gap-1 text-[#C8A96B] font-medium">
                              <Sparkles className="w-3 h-3 animate-spin" />
                              <span>Optimizing image ({formatFileSize(item.size)} &gt; 1.5 MB)...</span>
                            </span>
                          )}
                          {item.status === 'UPLOADING' && `Uploading: ${item.progress}% (${formatFileSize(item.bytesTransferred || 0)} / ${formatFileSize(item.size)})`}
                          {item.status === 'SAVING' && 'Saving metadata to gallery...'}
                          {item.status === 'COMPLETE' && (
                            <span className="inline-flex items-center gap-1.5">
                              <span>Complete</span>
                              {item.diagnostic?.processed && item.diagnostic.reductionPercentage && item.diagnostic.reductionPercentage > 0 ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-2xs border border-emerald-200">
                                  Saved {item.diagnostic.reductionPercentage}% ({formatFileSize(item.diagnostic.compressedSize)})
                                </span>
                              ) : null}
                            </span>
                          )}
                          {item.status === 'FAILED' && (
                            <span>
                              {item.errorMessage || 'Upload failed'}
                              {item.storageUrl ? ' (File safe in cloud — click retry to link metadata)' : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Retry or Remove) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === 'FAILED' && (
                      <button
                        onClick={() => retryItem(item.id)}
                        className="p-1.5 text-[#C8A96B] hover:text-[#B39356] hover:bg-[#F8F6F0] rounded-xs cursor-pointer"
                        title="Retry upload"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    {item.status !== 'UPLOADING' && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-[#77736B] hover:text-red-700 hover:bg-[#F8F6F0] rounded-xs cursor-pointer"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: IMAGE URL INPUT (FAST, INSTANT) */}
      {/* ========================================================================= */}
      {uploadMode === 'url' && (
        <form
          onSubmit={handleAddMediaFromUrl}
          className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 shadow-xs"
        >
          <div className="pb-4 border-b border-[#E8E0D0]">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
              Instant Media Addition
            </span>
            <h3 className="font-serif text-2xl text-[#171717] font-normal">
              Add Photo / Video via Image URL
            </h3>
            <p className="text-xs text-[#77736B] font-light mt-0.5">
              Add external high-resolution photographs directly without uploading files. Supports single or multiple URLs (separated by new lines).
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* URL Input */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Image / Video URL(s)
              </label>
              <textarea
                rows={3}
                value={imageUrlInput}
                onChange={(e) => handleUrlInputChange(e.target.value)}
                placeholder="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85&#10;(Paste multiple URLs on new lines for bulk addition)"
                className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs font-mono text-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                required
              />
              <span className="text-[10px] text-[#77736B] block mt-1">
                HTTPS URLs are verified. You can paste one URL or multiple URLs separated by newlines.
              </span>
            </div>

            {/* Live Preview (for single URL) */}
            {imageUrlInput.trim() && !imageUrlInput.includes('\n') && (
              <div className="p-3 bg-white border border-[#E8E0D0] rounded-xs flex items-center gap-4">
                <div className="w-20 h-20 bg-[#EFECE4] rounded-2xs overflow-hidden shrink-0 border border-[#E8E0D0] flex items-center justify-center">
                  <img
                    src={imageUrlInput.trim()}
                    alt="URL Preview"
                    className="w-full h-full object-cover"
                    onLoad={() => setUrlPreviewValid(true)}
                    onError={() => setUrlPreviewValid(false)}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {urlPreviewValid === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Image verified &amp; ready
                      </span>
                    )}
                    {urlPreviewValid === false && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" /> Unable to load preview (verify URL)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[#77736B] truncate">{imageUrlInput.trim()}</p>
                </div>
              </div>
            )}

            {/* Optional Metadata Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Alt Text / Caption (Optional)
                </label>
                <input
                  type="text"
                  value={urlAltText}
                  onChange={(e) => setUrlAltText(e.target.value)}
                  placeholder="e.g. Bridal portrait during golden hour"
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                />
              </div>

              {sections.length > 0 && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Assign to Section
                  </label>
                  <select
                    value={urlSectionId}
                    onChange={(e) => setUrlSectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                  >
                    <option value="">No Section (All Memories)</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="gold"
                size="md"
                type="submit"
                isLoading={isAddingUrl}
                disabled={!imageUrlInput.trim() || isAddingUrl}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {isAddingUrl ? 'Adding Media...' : 'Add Image to Album'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
