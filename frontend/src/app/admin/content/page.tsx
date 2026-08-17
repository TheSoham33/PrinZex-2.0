'use client';

import { useEffect, useState, type FormEvent, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBanners,
  fetchCategories,
  fetchFaqs,
  fetchTemplates,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  createFaq,
  updateFaq,
  deleteFaq,
  updateCategory,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type Banner,
  type FaqCategory,
  type ServiceCategoryRow,
  type TemplateRow,
} from '@/lib/api/admin-content';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Modal from '@/components/seller-dashboard/Modal';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconRefreshCw,
} from '@/components/icons';

const TABS = ['Banners', 'Service categories', 'Templates', 'FAQs'] as const;
type Tab = (typeof TABS)[number];

export default function AdminContentPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const bannersQ = useQuery({ queryKey: ['admin-banners'], queryFn: fetchBanners });
  const catsQ = useQuery({ queryKey: ['admin-categories'], queryFn: fetchCategories });
  const tplQ = useQuery({ queryKey: ['admin-templates'], queryFn: fetchTemplates });
  const faqQ = useQuery({ queryKey: ['admin-faqs'], queryFn: fetchFaqs });

  const [tab, setTab] = useState<Tab>('Banners');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cats, setCats] = useState<ServiceCategoryRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [faqs, setFaqs] = useState<FaqCategory[]>([]);

  const [bannerModal, setBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({ title: '', linkUrl: '', isActive: true, imageUrl: 'https://placehold.co/1200x400' });
  const [tplModal, setTplModal] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', category: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ kind: string; id: string; name: string } | null>(null);
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState<{ catId: string; q: string; a: string } | null>(null);

  const handleCloseBannerModal = useCallback(() => setBannerModal(false), []);
  const handleCloseTplModal = useCallback(() => setTplModal(false), []);

  useEffect(() => { if (bannersQ.data) setBanners(bannersQ.data); }, [bannersQ.data]);
  useEffect(() => { if (catsQ.data) setCats(catsQ.data); }, [catsQ.data]);
  useEffect(() => { if (tplQ.data) setTemplates(tplQ.data); }, [tplQ.data]);
  useEffect(() => { if (faqQ.data) setFaqs(faqQ.data); }, [faqQ.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  
  const addBannerM = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      showToast('Banner added');
      setBannerModal(false);
      setBannerForm({ title: '', linkUrl: '', isActive: true, imageUrl: 'https://placehold.co/1200x400' });
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateBannerM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      showToast('Updated successfully');
      setEditBannerId(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const deleteBannerM = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      showToast('Deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const reorderBannersM = useMutation({
    mutationFn: reorderBanners,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
      bannersQ.refetch();
    },
  });

  const addFaqM = useMutation({
    mutationFn: createFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      showToast('FAQ added');
      setFaqForm(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const deleteFaqM = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      showToast('Deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateCategoryM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      showToast('Category status updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const addTemplateM = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      showToast('Template added');
      setTplModal(false);
      setTplForm({ name: '', category: '' });
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateTemplateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      showToast('Template updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const deleteTemplateM = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      showToast('Template deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const move = useCallback((list: any[], index: number, dir: -1 | 1): any[] => {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }, []);

  const handleMoveBanner = (index: number, dir: -1 | 1) => {
    const nextList = move(banners, index, dir);
    setBanners(nextList);
    reorderBannersM.mutate(nextList.map(b => b.id));
  };

  const handleCloseDeleteModal = useCallback(() => setDeleteTarget(null), []);
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'banner') {
      deleteBannerM.mutate(deleteTarget.id);
    } else if (deleteTarget.kind.startsWith('faq:')) {
      deleteFaqM.mutate(deleteTarget.id);
    } else if (deleteTarget.kind === 'template') {
      deleteTemplateM.mutate(deleteTarget.id);
    }
  }, [deleteTarget, deleteBannerM, deleteFaqM, deleteTemplateM]);

  const bannerColumns: DataTableColumn<any>[] = [
    { key: 'preview', label: 'Preview', render: (r) => (
      <div className={`h-10 w-20 rounded bg-gradient-to-br ${r.color || 'from-blue-500 to-indigo-600'}`} aria-hidden />
    ) },
    { key: 'title', label: 'Title', render: (r) =>
      editBannerId === r.id ? (
        <input
          type="text"
          autoFocus
          defaultValue={r.title}
          onBlur={(e) => {
            if (e.target.value !== r.title) {
              updateBannerM.mutate({ id: r.id, data: { title: e.target.value } });
            } else {
              setEditBannerId(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditBannerId(null);
          }}
          className="input py-1.5 text-sm"
        />
      ) : (
        <span className="font-medium text-slate-900">{r.title}</span>
      ) },
    { key: 'linkUrl', label: 'Link', render: (r) => <span className="font-mono text-xs text-slate-500">{r.linkUrl}</span> },
    { key: 'isActive', label: 'Active', render: (r) => (
      <ToggleSwitch
        checked={Boolean(r.isActive || r.active)}
        disabled={updateBannerM.isPending && updateBannerM.variables?.id === r.id}
        onChange={(v) => updateBannerM.mutate({ id: r.id, data: { isActive: v } })}
        label={`${r.title} active`}
        hideLabel
      />
    ) },
    { key: 'order', label: 'Order', render: (r) => {
      const i = banners.findIndex((b) => b.id === r.id);
      return (
        <div className="flex gap-1">
          <button type="button" onClick={() => handleMoveBanner(i, -1)} disabled={i === 0 || reorderBannersM.isPending} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
            <IconArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => handleMoveBanner(i, 1)} disabled={i === banners.length - 1 || reorderBannersM.isPending} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
            <IconArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    } },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setEditBannerId(r.id)} className="btn-secondary text-xs">Edit</button>
        <button type="button" onClick={() => setDeleteTarget({ kind: 'banner', id: r.id, name: r.title })} className="btn-secondary text-xs text-red-600">
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    ) },
  ];

  const catColumns: DataTableColumn<any>[] = [
    { key: 'name', label: 'Category', sortable: true },
    { key: 'slug', label: 'Slug' },
    { key: 'serviceCount', label: 'Services' },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch 
        checked={r.active} 
        label="Active" 
        hideLabel 
        disabled={updateCategoryM.isPending && updateCategoryM.variables?.id === r.id}
        onChange={(v) => updateCategoryM.mutate({ id: r.id, data: { isActive: v } })} 
      />
    ) },
  ];

  const tplColumns: DataTableColumn<any>[] = [
    { key: 'thumb', label: 'Preview', render: (r) => <div className={`h-10 w-14 rounded ${r.color}`} aria-hidden /> },
    { key: 'name', label: 'Template', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'usageCount', label: 'Uses' },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch 
        checked={r.active} 
        disabled={updateTemplateM.isPending && updateTemplateM.variables?.id === r.id}
        onChange={(v) => updateTemplateM.mutate({ id: r.id, data: { isActive: v } })}
        label="Active" 
        hideLabel 
      />
    ) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <button 
        type="button" 
        onClick={() => setDeleteTarget({ kind: 'template', id: r.id, name: r.name })} 
        className="btn-secondary text-xs text-red-600"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </button>
    ) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content</h1>
          <p className="mt-1 text-sm text-slate-600">Homepage banners, categories, templates and FAQs.</p>
        </div>
        <button onClick={() => { bannersQ.refetch(); faqQ.refetch(); catsQ.refetch(); tplQ.refetch(); }} className="btn-secondary text-sm">
          <IconRefreshCw className={`h-4 w-4 ${(bannersQ.isFetching || faqQ.isFetching || catsQ.isFetching || tplQ.isFetching) ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div role="tablist" aria-label="Content sections" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Banners' && (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setBannerModal(true)} className="btn-primary"><IconPlus className="h-4 w-4" /> Add banner</button>
          </div>
          <DataTable data={banners} columns={bannerColumns} isLoading={bannersQ.isLoading} caption="Homepage banners" emptyMessage="No banners yet." />
        </>
      )}

      {tab === 'Service categories' && (
        <DataTable data={cats} columns={catColumns} isLoading={catsQ.isLoading} caption="Service categories" emptyMessage="No categories." />
      )}

      {tab === 'Templates' && (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setTplModal(true)} className="btn-primary"><IconPlus className="h-4 w-4" /> Upload template</button>
          </div>
          <DataTable data={templates} columns={tplColumns} isLoading={tplQ.isLoading} caption="Design templates" emptyMessage="No templates." />
        </>
      )}

      {tab === 'FAQs' && (
        <div className="space-y-3">
          {faqs.map((cat) => (
            <div key={cat.id || cat.name} className="card overflow-hidden">
              <button type="button" onClick={() => setOpenFaq(openFaq === cat.id ? null : cat.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                <span className="font-semibold text-slate-900">{cat.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{cat.items?.length || 0} questions</span>
                  <IconChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openFaq === cat.id ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {openFaq === cat.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2">
                    {cat.items?.map((item) => (
                      <div key={item.id || `faq-${item.question}`} className="rounded-lg bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.answer}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setDeleteTarget({ kind: `faq:${cat.id}`, id: item.id, name: item.question })} 
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {faqForm?.catId === cat.id ? (
                    <form
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!faqForm.q.trim()) return;
                        addFaqM.mutate({ title: faqForm.q, body: faqForm.a, category: cat.name });
                      }}
                      className="mt-3 space-y-2 rounded-lg bg-white p-3"
                    >
                      <div>
                        <label className="label text-xs">Question</label>
                        <input type="text" autoFocus value={faqForm.q} onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })} className="input py-2 text-sm" />
                      </div>
                      <div>
                        <label className="label text-xs">Answer</label>
                        <textarea rows={2} value={faqForm.a} onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })} className="input resize-none py-2 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={addFaqM.isPending} className="btn-primary text-xs">Add FAQ</button>
                        <button type="button" onClick={() => setFaqForm(null)} className="btn-secondary text-xs">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setFaqForm({ catId: cat.id, q: '', a: '' })} className="btn-secondary mt-3 text-xs">
                      <IconPlus className="h-3.5 w-3.5" /> Add FAQ
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={bannerModal} title="Add banner" onClose={handleCloseBannerModal}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addBannerM.mutate({
              title: bannerForm.title,
              linkUrl: bannerForm.linkUrl,
              isActive: bannerForm.isActive,
              imageUrl: bannerForm.imageUrl,
              order: banners.length
            });
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="bn-title" className="label">Title</label>
            <input id="bn-title" type="text" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="bn-link" className="label">Link URL</label>
            <input id="bn-link" type="text" value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} placeholder="/stores" className="input" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Active</span>
            <ToggleSwitch checked={bannerForm.isActive} onChange={(v) => setBannerForm({ ...bannerForm, isActive: v })} label="Banner active" hideLabel />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleCloseBannerModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={addBannerM.isPending} className="btn-primary flex-1">{addBannerM.isPending ? 'Saving...' : 'Add banner'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={tplModal} title="Upload template" onClose={handleCloseTplModal}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!tplForm.name.trim()) return;
            addTemplateM.mutate({ name: tplForm.name.trim(), category: tplForm.category });
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="tpl-name" className="label">Name</label>
            <input id="tpl-name" type="text" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="tpl-cat" className="label">Category</label>
            <select id="tpl-cat" value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })} className="input">
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleCloseTplModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={addTemplateM.isPending} className="btn-primary flex-1">
              {addTemplateM.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this item?"
        message={`"${deleteTarget?.name ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onCancel={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
