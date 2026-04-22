import * as React from 'react';
import { useCallback, useState } from 'react';
import { cn } from '../ui/utils';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  isUploading?: boolean;
  uploadedFiles?: UploadedFile[];
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploadZone({
  onFilesSelected,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_SIZE,
  maxFiles = 10,
  isUploading = false,
  uploadedFiles = [],
  className
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Accepted: PDF, PNG, JPG`);
        continue;
      }

      // Check file size
      if (file.size > maxFileSize) {
        const maxMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`${file.name}: File too large. Maximum size: ${maxMB}MB`);
        continue;
      }

      valid.push(file);
    }

    // Check total files
    const totalFiles = uploadedFiles.length + valid.length;
    if (totalFiles > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid: valid.slice(0, maxFiles - uploadedFiles.length), errors };
    }

    return { valid, errors };
  }, [acceptedTypes, maxFileSize, maxFiles, uploadedFiles.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setValidationError(errors.join('\n'));
    } else {
      setValidationError(null);
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }, [validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setValidationError(errors.join('\n'));
    } else {
      setValidationError(null);
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateFiles, onFilesSelected]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'success': return 'Uploaded';
      case 'error': return 'Failed';
      case 'uploading': return 'Uploading...';
      default: return 'Pending';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <Card
        className={cn(
          'cursor-pointer border-2 border-dashed transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
        onClick={!isUploading ? handleClick : undefined}
        onDrop={!isUploading ? handleDrop : undefined}
        onDragOver={!isUploading ? handleDragOver : undefined}
        onDragLeave={!isUploading ? handleDragLeave : undefined}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-4xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-1">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Accepted: PDF, PNG, JPG (max {Math.round(maxFileSize / (1024 * 1024))}MB each)
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600 whitespace-pre-line">{validationError}</p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className={cn('text-xs font-medium', getStatusColor(uploadedFile.status))}>
                      {getStatusText(uploadedFile.status)}
                    </span>
                  </div>
                </div>
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2">
                    <Progress value={uploadedFile.progress} className="h-1" />
                  </div>
                )}
                {uploadedFile.error && (
                  <p className="mt-1 text-xs text-red-600">{uploadedFile.error}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUploadZone;
