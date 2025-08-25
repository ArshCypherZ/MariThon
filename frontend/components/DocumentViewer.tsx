import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { FileText, AlertTriangle, Clock, Anchor } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface Highlight {
  type: 'laytime' | 'demurrage' | 'alert';
  text: string;
  start: number;
  end: number;
}

interface DocumentViewerProps {
  text: string;
  clauses: { range: [number, number], type: 'laytime' | 'demurrage' }[];
  alert: any; // alertData
  documentName: string;
}

export default function DocumentViewer({ text, clauses, alert, documentName }: DocumentViewerProps) {
  const [selectedHighlightType, setSelectedHighlightType] = useState<string | null>(null);

  const highlights = useMemo((): Highlight[] => {
    const combined: Highlight[] = [];

    // Add clauses
    clauses.forEach(c => {
      combined.push({
        type: c.type,
        start: c.range[0],
        end: c.range[1],
        text: text.slice(c.range[0], c.range[1]),
      });
    });

    // Add alert evidence
    if (alert?.evidence_offsets) {
      try {
        const ranges = JSON.parse(alert.evidence_offsets);
        if (Array.isArray(ranges)) {
          ranges.forEach(range => {
            if (Array.isArray(range) && range.length === 2) {
              combined.push({
                type: 'alert',
                start: range[0],
                end: range[1],
                text: text.slice(range[0], range[1]),
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse alert evidence offsets", e);
      }
    }

    return combined.sort((a, b) => a.start - b.start);
  }, [text, clauses, alert]);

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'laytime': return 'bg-yellow-200 hover:bg-yellow-300';
      case 'demurrage': return 'bg-blue-200 hover:bg-blue-300';
      case 'alert': return 'bg-red-200 hover:bg-red-300';
      default: return 'bg-gray-200';
    }
  };

  const getHighlightBadgeColor = (type: string) => {
    switch (type) {
      case 'laytime': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demurrage': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'alert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'laytime': return <Clock className="w-4 h-4" />;
      case 'demurrage': return <Anchor className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const renderHighlightedText = (content: string, highlightsToRender: Highlight[]) => {
    if (!highlightsToRender || highlightsToRender.length === 0) {
      return <span>{content}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    highlightsToRender.forEach((highlight, index) => {
      if (highlight.start > lastEnd) {
        parts.push(
          <span key={`text-${index}`}>
            {content.slice(lastEnd, highlight.start)}
          </span>
        );
      }
      parts.push(
        <span
          key={`highlight-${index}`}
          id={`highlight-${highlight.start}`}
          className={`${getHighlightColor(highlight.type)} px-1 rounded cursor-pointer transition-colors`}
          onClick={() => setSelectedHighlightType(highlight.type)}
          title={`${highlight.type.charAt(0).toUpperCase() + highlight.type.slice(1)} Clause`}
        >
          {content.slice(highlight.start, highlight.end)}
        </span>
      );
      lastEnd = highlight.end;
    });

    if (lastEnd < content.length) {
      parts.push(
        <span key="text-end">
          {content.slice(lastEnd)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  const scrollToHighlight = (type: string) => {
    setSelectedHighlightType(type);
    const firstHighlight = highlights.find(h => h.type === type);
    if (firstHighlight) {
      const element = document.getElementById(`highlight-${firstHighlight.start}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const groupedHighlights = highlights.reduce((acc, highlight) => {
    if (!acc[highlight.type]) {
      acc[highlight.type] = [];
    }
    acc[highlight.type].push(highlight);
    return acc;
  }, {} as Record<string, Highlight[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Panel - Navigation */}
      <div className="lg:col-span-1">
        <div className="space-y-6 sticky top-8">
          {/* Key Clauses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Clauses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(groupedHighlights).length > 0 ? (
                Object.entries(groupedHighlights).map(([type, highlightsOfType]) => (
                  <button
                    key={type}
                    onClick={() => scrollToHighlight(type)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedHighlightType === type
                        ? getHighlightBadgeColor(type)
                        : 'hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {getHighlightIcon(type)}
                      <span className="font-medium capitalize">{type} Clause</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {highlightsOfType.length} occurrence{highlightsOfType.length !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">No clauses found.</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {groupedHighlights.alert && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    High Priority
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {alert?.message || "Alert detected in document."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Highlight Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                <span className="text-sm">Laytime Clauses</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-200 rounded"></div>
                <span className="text-sm">Demurrage Clauses</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span className="text-sm">Alert Evidence</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Document Content */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>{documentName}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[80vh] w-full">
              <div className="prose dark:prose-invert max-w-none">
                {text ? (
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                    {renderHighlightedText(text, highlights)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Document content not available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
