"use client";

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  filename: string;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
}

interface Voyage {
  id: string;
  name: string;
  documents: Document[];
}

interface VoyagePageProps {
  voyage: Voyage;
  onViewDocument: (documentId: number) => void;
  onFileUpload: (files: FileList | null) => void;
  selectedDocId: number | null;
  children: React.ReactNode;
}

export default function VoyagePage({ voyage, onViewDocument, onFileUpload, selectedDocId, children }: VoyagePageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'ready': return 'bg-green-100 text-green-800 border-green-200';
        case 'error': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">{voyage.name}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Upload and Documents List */}
        <div className="md:col-span-1 space-y-8">
            {/* Upload Section */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Upload Documents</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
                    ? 'border-[#4044ed] bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Document
                </h3>
                <p className="text-gray-600 mb-4">
                    Drag and drop, or click to browse
                </p>
                <input
                    type="file"
                    id="fileUpload"
                    className="hidden"
                    accept=".pdf,.docx"
                    multiple
                    onChange={(e) => onFileUpload(e.target.files)}
                />
                <Button
                    onClick={() => document.getElementById('fileUpload')?.click()}
                    className="bg-[#4044ed] hover:bg-[#3338d1]"
                >
                    Choose Files
                </Button>
                </div>
            </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
            <CardHeader>
                <CardTitle>Documents ({voyage.documents?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
                {voyage.documents?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No documents uploaded yet</p>
                </div>
                ) : (
                <div className="space-y-4">
                    {voyage.documents.map((document) => (
                    <div
                        key={document.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${selectedDocId === Number(document.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
                        onClick={() => onViewDocument(Number(document.id))}
                    >
                        <div className="flex items-center space-x-3">
                        <FileText className="w-6 h-6 text-gray-500" />
                        <div>
                            <h4 className="font-medium text-gray-900">{document.filename}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(document.created_at).toLocaleDateString()}</span>
                                </div>
                                <Badge className={`flex items-center space-x-1 text-xs ${getStatusColor(document.status)}`}>
                                    {getStatusIcon(document.status)}
                                    <span>{document.status}</span>
                                </Badge>
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </CardContent>
            </Card>
        </div>

        {/* Right Column: Document Viewer */}
        <div className="md:col-span-2">
            {children}
        </div>
      </div>
    </div>
  );
}
