"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Ship, Shield } from "lucide-react";

export default function Login({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4gPGcgZmlsbD0iIzM3NDE1YSIgZmlsbC1vcGFjaXR5PSIwLjA1Ij4gPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPiA8L2c+IDwvZz4gPC9zdmc+')] opacity-20"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">Voyage Analyzer</h1>
          <p className="text-blue-200">Intelligent Document Analysis for Maritime Operations</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-gray-800">Welcome Back</CardTitle>
            <p className="text-center text-gray-600">Sign in to access your dashboard</p>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="text-white/80">
            <FileText className="w-6 h-6 mx-auto mb-2 text-blue-300" />
            <p className="text-sm">Document Analysis</p>
          </div>
          <div className="text-white/80">
            <Shield className="w-6 h-6 mx-auto mb-2 text-blue-300" />
            <p className="text-sm">Secure Processing</p>
          </div>
          <div className="text-white/80">
            <Ship className="w-6 h-6 mx-auto mb-2 text-blue-300" />
            <p className="text-sm">Maritime Focus</p>
          </div>
        </div>
      </div>
    </div>
  );
}
