import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export function EntityDetailModal({ isOpen, onClose, title, data }: EntityDetailModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-xl bg-card text-card-foreground shadow-lg border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="border-b pb-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-sm font-medium">
                  {typeof value === 'object' ? (value ? 'Object/Array' : 'null') : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
}
