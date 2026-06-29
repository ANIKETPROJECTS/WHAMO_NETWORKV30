import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ValidationError } from "@/lib/validator";
import { AlertCircle, AlertTriangle, XCircle, CheckCircle2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function ValidationModal({
  isOpen,
  onClose,
  onGenerate,
  errors,
  warnings,
}: ValidationModalProps) {
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const elementTypes = useMemo(() => {
    const types = new Set<string>();
    [...errors, ...warnings].forEach(v => {
      if (v.elementType) types.add(v.elementType);
    });
    return Array.from(types).sort();
  }, [errors, warnings]);

  const filteredErrors = useMemo(() => {
    return errors.filter(err => {
      const matchesText = err.message.toLowerCase().includes(filterText.toLowerCase()) || 
                          (err.elementLabel?.toLowerCase().includes(filterText.toLowerCase()) || false);
      const matchesType = filterType === "all" || err.elementType === filterType;
      return matchesText && matchesType;
    });
  }, [errors, filterText, filterType]);

  const filteredWarnings = useMemo(() => {
    return warnings.filter(warn => {
      const matchesText = warn.message.toLowerCase().includes(filterText.toLowerCase()) || 
                          (warn.elementLabel?.toLowerCase().includes(filterText.toLowerCase()) || false);
      const matchesType = filterType === "all" || warn.elementType === filterType;
      return matchesText && matchesType;
    });
  }, [warnings, filterText, filterType]);

  const hasErrors = errors.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="w-6 h-6 text-primary" />
            Network Validation Report
          </DialogTitle>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by label or message..."
                className="pl-8"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                data-testid="input-filter-validation"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Element Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {elementTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 mt-4">
          <div className="space-y-6 pb-6">
            {filteredErrors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-destructive font-bold flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                  <XCircle className="w-5 h-5" />
                  Errors ({filteredErrors.length})
                </h3>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                  {filteredErrors.map((err, i) => (
                    <div key={i} className="text-sm flex gap-2">
                      <span className="text-destructive font-mono flex-shrink-0">•</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredWarnings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-amber-600 font-bold flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings ({filteredWarnings.length})
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  {filteredWarnings.map((err, i) => (
                    <div key={i} className="text-sm flex gap-2">
                      <span className="text-amber-600 font-mono flex-shrink-0">•</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(errors.length > 0 || warnings.length > 0) && filteredErrors.length === 0 && filteredWarnings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>No results match your filters.</p>
                <Button variant="link" onClick={() => { setFilterText(""); setFilterType("all"); }}>
                  Clear all filters
                </Button>
              </div>
            )}

            {errors.length === 0 && warnings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Network is Valid</h3>
                <p className="text-muted-foreground">Everything looks good! You can proceed with generation.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0 border-t mt-auto gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} data-testid="button-close-validation">
            Close
          </Button>
          <Button 
            onClick={onGenerate} 
            disabled={hasErrors}
            data-testid="button-generate-anyway"
            className={!hasErrors ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {hasErrors ? "Fix Errors to Generate" : "Generate Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
