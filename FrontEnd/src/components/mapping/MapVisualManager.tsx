import { useState } from 'react';
import { Upload, Map as MapIcon, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/api/client';
import axios from 'axios';

interface MapVisualManagerProps {
  fieldId: string;
  initialVisualUrl?: string;
  initialBounds?: number[][];
  onSuccess: () => void;
}

export function MapVisualManager({ fieldId, initialVisualUrl, initialBounds, onSuccess }: MapVisualManagerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [bounds, setBounds] = useState<string>(
    initialBounds ? JSON.stringify(initialBounds) : '[[ -6.2100, 106.8100], [-6.2110, 106.8110]]'
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      // 1. Get presigned URL
      const { data: { data: { uploadUrl, storageKey } } } = await apiClient.post(`/fields/${fieldId}/map-visual/upload-url`, {
        filename: file.name,
        content_type: file.type
      });

      // 2. Upload to R2 directly
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      // 3. Finalize
      await apiClient.post(`/fields/${fieldId}/map-visual/finalize`, {
        storage_key: storageKey
      });

      // 4. Update Bounds
      let parsedBounds;
      try {
        parsedBounds = JSON.parse(bounds);
      } catch (e) {
        throw new Error('Format koordinat tidak valid. Gunakan format: [[lat, lng], [lat, lng]]');
      }

      await apiClient.patch(`/fields/${fieldId}/map-visual/bounds`, {
        bounds: parsedBounds
      });

      setFile(null);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Gagal mengupload visual');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-muted/10">
      <div className="flex items-center gap-2 mb-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Drone Imagery (2D Visual)</h3>
      </div>

      {initialVisualUrl && !file && (
        <div className="relative aspect-video rounded-lg overflow-hidden border bg-background group">
          <img src={initialVisualUrl} alt="Map Visual" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm" onClick={() => setFile(null)}>Ganti Gambar</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {!initialVisualUrl || file ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {file ? file.name : "Upload Orthophoto (PNG/JPG)"}
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png,image/jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Koordinat Pembatas (Georeference)</label>
              <input 
                value={bounds}
                onChange={(e) => setBounds(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs font-mono"
                placeholder="[[top, left], [bottom, right]]"
              />
              <p className="text-[10px] text-muted-foreground italic">Contoh: [[-6.2100, 106.8100], [-6.2110, 106.8110]]</p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button 
              className="w-full" 
              onClick={handleUpload} 
              disabled={!file || uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Simpan Visual Lahan
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-background p-2 rounded border">
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Visual Aktif
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={async () => {
              if(confirm('Hapus visual peta ini?')) {
                await apiClient.delete(`/fields/${fieldId}/map-visual`);
                onSuccess();
              }
            }}>Hapus</Button>
          </div>
        )}
      </div>
    </div>
  );
}
