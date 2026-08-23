import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { Image as ImageIcon, Plus, Trash2, Pencil, GripVertical, Upload, Link2, Eye, EyeOff, X, Check, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import api from '../lib/api';

const CATEGORIES = [

  // Website
  { value: "website_logo", label: "Website Logo" },
  { value: "footer_logo", label: "Footer Logo" },
  { value: "favicon", label: "Favicon" },

  { value: "hero_background", label: "Hero Background" },
  { value: "hero_side_image", label: "Hero Side Image" },

  { value: "about_image", label: "About Section" },

  { value: "contact_banner", label: "Contact Banner" },

  { value: "gallery", label: "Website Gallery" },

  { value: "testimonial", label: "Testimonials" },

  { value: "blog", label: "Blog Images" },

  { value: "advertisement", label: "Advertisements" },

  // Properties

  { value: "hostel_cover", label: "Property Cover" },

  { value: "hostel_gallery", label: "Property Gallery" },

  // Rooms

  { value: "room_cover", label: "Room Cover" },

  { value: "room_gallery", label: "Room Gallery" },

  // Default Images

  { value: "default_property", label: "Default Property Image" },

  { value: "default_room", label: "Default Room Image" },

  // Others

  { value: "other", label: "Other" }

];

export default function WebsiteImagesPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [images, setImages] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('hero_banner');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
const [form, setForm] = useState({

    title: "",

    description: "",

    alt_text: "",

    category: "hero_background",

    image_key: "",

    hostel_id: "",

    room_id: "",

    url: "",

    uploadMode: "url",

});  const [preview, setPreview] = useState('');
const [search, setSearch] = useState("");
  const fileRef = useRef(null);

  const fetchImages = useCallback(() => {
    const params = { category: activeCategory };
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/website-images', { params }).then(res => setImages(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [activeCategory, selectedHostel]);

  useEffect(() => { fetchImages(); }, [fetchImages]);
  useEffect(() => {
    if (user?.role === 'super_admin') api.get('/hostels').then(r => setHostels(r.data)).catch(() => {});
  }, [user]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result); setForm(f => ({ ...f, url: '' })); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.url && !preview) { toast.error('Provide an image URL or upload a file'); return; }
    try {
      const hostelId = form.hostel_id || (user?.role === 'hostel_admin' ? user?.hostel_id : null) || null;
      const payload = {
        title: form.title,
        alt_text: form.alt_text || form.title,
        category: form.category,
        image_key: form.image_key || form.category || '',
        hostel_id: hostelId,  // null — never empty string
        url: form.url || '',
        data: preview && !form.url ? preview : null,
      };
      if (editing) {
        await api.put(`/website-images/${editing}`, payload);
        toast.success('Image updated');
      } else {
        await api.post('/website-images', payload);
        toast.success('Image uploaded');
      }
      setDialogOpen(false); setEditing(null); setPreview(''); fetchImages();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving image'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    try { await api.delete(`/website-images/${id}`); toast.success('Image deleted'); fetchImages(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const toggleActive = async (id, active) => {
    try { await api.put(`/website-images/${id}`, { active: !active }); fetchImages(); }
    catch { toast.error('Error'); }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', alt_text: '', category: activeCategory, hostel_id: selectedHostel?.id || '', url: '', uploadMode: 'url' });
    setPreview('');
    setDialogOpen(true);
  };

  const openEdit = (img) => {
    setEditing(img.id);
    setForm({ title: img.title || '', alt_text: img.alt_text || '', category: img.category, hostel_id: img.hostel_id || '', url: img.url || '', uploadMode: 'url' });
    setPreview(img.url || '');
    setDialogOpen(true);
  };

  const categoryLabel = CATEGORIES.find(c => c.value === activeCategory)?.label || activeCategory;
  const getHostelName = (hid) => hostels.find(h => h.id === hid)?.name || '';

  return (
  <div className="space-y-8">

    {/* Header */}
    <div className="flex items-center justify-between">

      <div>
        <h1
          className="text-2xl font-semibold text-[#0F172A] tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Website Images
        </h1>

        <p className="text-sm text-[#64748B] mt-1">
          Manage all images displayed on the public website.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">

        <Input
          placeholder="Search images..."
          className="w-full sm:w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Button
          data-testid="upload-image-btn"
          className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white w-full sm:w-auto"
          onClick={openNew}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>

      </div>

    </div>

    {/* Statistics */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Total Images</p>
          <h2 className="text-3xl font-bold mt-2">
            {images.length}
          </h2>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Active</p>
          <h2 className="text-3xl font-bold mt-2 text-green-600">
            {images.filter((i) => i.active).length}
          </h2>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Hidden</p>
          <h2 className="text-3xl font-bold mt-2 text-red-600">
            {images.filter((i) => !i.active).length}
          </h2>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Current Category</p>
          <h2 className="text-xl font-semibold mt-2">
            {categoryLabel}
          </h2>
        </CardContent>
      </Card>

    </div>

    {/* Main Layout */}
<div className="grid grid-cols-12 gap-6">

  {/* LEFT SIDEBAR */}
  <div className="col-span-3">

    <div className="rounded-2xl border bg-white p-5 sticky top-5">

      <h3 className="font-semibold text-lg mb-5">
        Media Library
      </h3>

      <div className="space-y-2">

        {CATEGORIES.map((c) => (

          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${
              activeCategory === c.value
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-100"
            }`}
          >
            {c.label}
          </button>

        ))}

      </div>

    </div>

  </div>

  {/* RIGHT CONTENT */}
  <div className="col-span-9">

    {/* Category Pills */}
    <div className="flex flex-wrap gap-2 mb-6">

      {CATEGORIES.map((c) => (

        <button
          key={c.value}
          onClick={() => setActiveCategory(c.value)}
          data-testid={`cat-${c.value}`}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeCategory === c.value
              ? "bg-[#1D4ED8] text-white"
              : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D4ED8]/40"
          }`}
        >
          {c.label}
        </button>

      ))}

    </div>

    {/* Image Grid */}

    {loading ? (

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {[1,2,3,4].map((i) => (

          <div
            key={i}
            className="aspect-[4/3] bg-slate-100 rounded-xl animate-pulse"
          />

        ))}

      </div>

    ) : images.length === 0 ? (

      <Card className="border-[#E2E8F0]">

        <CardContent className="py-16 text-center">

          <FolderOpen className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />

          <p className="text-[#64748B] font-medium">
            No {categoryLabel} images yet
          </p>

          <p className="text-sm text-[#94A3B8] mt-1">
            Upload your first image for this category
          </p>

          <Button
            onClick={openNew}
            className="mt-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
            size="sm"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload Image
          </Button>

        </CardContent>

      </Card>

    ) : (

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {images
          .filter(
            (img) =>
              img.title?.toLowerCase().includes(search.toLowerCase()) ||
              img.category?.toLowerCase().includes(search.toLowerCase())
          )
          .map((img) => (

            <Card
              key={img.id}
              className={`border-[#E2E8F0] overflow-hidden group ${
                !img.active ? "opacity-50" : ""
              }`}
              data-testid={`image-card-${img.id}`}
            >

              <div className="relative aspect-[4/3] bg-[#F1F5F9] overflow-hidden">

                <img
                  src={img.url || img.data || ""}
                  alt={img.alt_text || img.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />

                {!img.active && (

                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">

                    <Badge className="bg-red-500 text-white text-[10px]">
                      Hidden
                    </Badge>

                  </div>

                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">

                  <div className="flex gap-2">

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 bg-white/90 text-xs"
                      onClick={() => openEdit(img)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 bg-white/90 text-xs text-red-600"
                      onClick={() => handleDelete(img.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>

                  </div>

                </div>

              </div>

              <CardContent className="p-3">

                <div className="flex items-start justify-between gap-2">

                  <div className="min-w-0">

                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {img.title}
                    </p>

                    {img.hostel_id && (
                      <p className="text-[10px] text-[#94A3B8] truncate">
                        {getHostelName(img.hostel_id)}
                      </p>
                    )}

                  </div>

                  <button
                    onClick={() => toggleActive(img.id, img.active)}
                    className={`shrink-0 p-1 rounded ${
                      img.active
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  >
                    {img.active ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                </div>

              </CardContent>

            </Card>

          ))}

      </div>

    )}

  </div>

</div>

            {/* Upload / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Outfit" }}>
              {editing ? "Edit Image" : "Upload New Image"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">

            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                data-testid="image-title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Image title"
              />
            </div>

            <div>
              <Label className="text-xs">Alt Text</Label>
              <Input
                value={form.alt_text}
                onChange={(e) =>
                  setForm({ ...form, alt_text: e.target.value })
                }
                placeholder="Describe the image"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <Label className="text-xs">Category</Label>

                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>

                </Select>

              </div>

              {user?.role === "super_admin" && (

                <div>

                  <Label className="text-xs">
                    Property (optional)
                  </Label>

                  <Select
                    value={form.hostel_id || "__global__"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        hostel_id:
                          v === "__global__" ? "" : v,
                      })
                    }
                  >

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>

                      <SelectItem value="__global__">
                        Global (all properties)
                      </SelectItem>

                      {hostels.map((h) => (
                        <SelectItem
                          key={h.id}
                          value={h.id}
                        >
                          {h.name}
                        </SelectItem>
                      ))}

                    </SelectContent>

                  </Select>

                </div>

              )}

            </div>

            {/* Image Source */}

            <div>

              <Label className="text-xs mb-2 block">
                Image Source
              </Label>

              <Tabs
                value={form.uploadMode}
                onValueChange={(v) =>
                  setForm({ ...form, uploadMode: v })
                }
              >

                <TabsList className="h-8 bg-[#F1F5F9]">

                  <TabsTrigger
                    value="url"
                    className="text-xs h-7"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    URL
                  </TabsTrigger>

                  <TabsTrigger
                    value="file"
                    className="text-xs h-7"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    File Upload
                  </TabsTrigger>

                </TabsList>

                <TabsContent value="url" className="mt-2">

                  <Input
                    value={form.url}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        url: e.target.value,
                      });
                      setPreview(e.target.value);
                    }}
                    placeholder="https://example.com/image.jpg"
                  />

                </TabsContent>

                <TabsContent value="file" className="mt-2">

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed border-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      Click to select image
                    </div>
                  </Button>

                </TabsContent>

              </Tabs>

            </div>

            {preview && (

              <div className="relative rounded-lg overflow-hidden border">

                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-40 object-contain"
                />

                <button
                  onClick={() => {
                    setPreview("");
                    setForm((f) => ({
                      ...f,
                      url: "",
                    }));
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
                >
                  <X className="w-3 h-3" />
                </button>

              </div>

            )}

            <Button
              onClick={handleSave}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF]"
            >
              {editing
                ? "Update Image"
                : "Upload Image"}
            </Button>

          </div>

        </DialogContent>
      </Dialog>

    </div>
  );
}