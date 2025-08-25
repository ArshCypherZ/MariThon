"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, LogOut, FileText, Plus, RefreshCw } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";

interface Alert {
  id: string;
  title: string;
  voyage_id: string;
  voyageName: string;
  severity: 'High' | 'Medium' | 'Low';
  created_at: string;
  document_id?: string;
  message: string;
}

interface Voyage {
  id: string;
  name: string;
  documents: any[];
}

interface DashboardProps {
  alerts: Alert[];
  voyages: Voyage[];
  onRefresh: () => void;
  onAddVoyage: () => void;
  fmtAlert: (alert: Alert) => string;
}

export default function Dashboard({ alerts, voyages, onRefresh, onAddVoyage, fmtAlert }: DashboardProps) {
  const { signOut } = useClerk();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#4044ed] rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Voyage Document Analyzer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={onRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-gray-900 mb-2">Recent Alerts</h2>
            <p className="text-gray-600">Monitor critical issues across all your voyages</p>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
          {alerts.map((alert) => (
            <Card key={alert.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(alert.created_at).toLocaleDateString()}
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight">{alert.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    {fmtAlert(alert)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Voyage:</span> {voyages.find(v => v.id === alert.voyage_id)?.name}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/voyages/${alert.voyage_id}?alertId=${alert.id}&mode=alert`}>View Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Voyages Section */}
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-gray-900">All Voyages</h3>
            <Button onClick={onAddVoyage} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Voyage</span>
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {voyages.map((voyage) => (
            <Card key={voyage.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{voyage.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{voyage.documents?.length || 0}</span> documents
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                    <Link href={`/voyages/${voyage.id}`}>Manage Voyage</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
