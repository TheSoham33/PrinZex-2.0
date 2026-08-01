'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchBanners,
  fetchCategories,
  fetchFaqs,
  fetchTemplates,
} from '@/lib/api/admin-payouts';
import type {
  Banner,
  FaqCategory,
  ServiceCategoryRow,
  TemplateRow,
} from '@/lib/mock-data/admin-payouts';
import DataTable, { type DataTableColumn } from '@/components/admin/DataTable';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Modal from '@/components/seller-dashboard/Modal';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconHelpCircle,
  IconPlus,
  IconTrash,
} from '@/components/icons';

const TABS = ['Banners', 'Service categories', 'Templates', 'FAQs'] as const;
type Tab = (typeof TABS)[number];

export default function AdminContentPage() {
  const { showToast } = useToast();
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
  const [bannerForm, setBannerForm] = useState({ title: '', linkUrl: '', active: true });
  const [tplModal, setTplModal] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', category: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ kind: string; id: string; name: string } | null>(null);
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState({ name: '', slug: '' });
  const [openFaq, setOpenFaq] = useState<string | null>('FQ-1');
  const [faqForm, setFaqForm] = useState<{ catId: string; q: string; a: string } | null>(null);

  useEffect(() => { if (bannersQ.data) setBanners(bannersQ.data); }, [bannersQ.data]);
  useEffect(() => { if (catsQ.data) setCats(catsQ.data); }, [catsQ.data]);
  useEffect(() => { if (tplQ.data) setTemplates(tplQ.data); }, [tplQ.data]);
  useEffect(() => { if (faqQ.data) setFaqs(faqQ.data); }, [faqQ.data]);

  /** Move an item up or down within its array. */
  const move = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const bannerColumns: DataTableColumn<Banner>[] = [
    { key: 'preview', label: 'Preview', render: (r) => (
      <div className={`h-10 w-20 rounded bg-gradient-to-br ${r.color}`} aria-hidden />
    ) },
    { key: 'title', label: 'Title', render: (r) =>
      editBanner === r.id ? (
        <input
          type="text"
          autoFocus
          defaultValue={r.title}
          aria-label={`Title for ${r.title}`}
          onBlur={(e) => {
            setBanners((prev) => prev.map((b) => (b.id === r.id ? { ...b, title: e.target.value } : b)));
            setEditBanner(null);
            showToast('Banner updated');
          }}
          className="input py-1.5 text-sm"
        />
      ) : (
        <span className="font-medium text-slate-900">{r.title}</span>
      ) },
    { key: 'linkUrl', label: 'Link', render: (r) => <span className="font-mono text-xs text-slate-500">{r.linkUrl}</span> },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch
        checked={r.active}
        onChange={(v) => setBanners((prev) => prev.map((b) => (b.id === r.id ? { ...b, active: v } : b)))}
        label={`${r.title} active`}
        hideLabel
      />
    ) },
    { key: 'order', label: 'Order', render: (r) => {
      const i = banners.findIndex((b) => b.id === r.id);
      return (
        <div className="flex gap-1">
          <button type="button" onClick={() => setBanners((prev) => move(prev, i, -1))} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label={`Move ${r.title} up`}>
            <IconArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setBanners((prev) => move(prev, i, 1))} disabled={i === banners.length - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label={`Move ${r.title} down`}>
            <IconArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    } },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setEditBanner(r.id)} className="btn-secondary text-xs">Edit</button>
        <button type="button" onClick={() => setDeleteTarget({ kind: 'banner', id: r.id, name: r.title })} className="btn-secondary text-xs text-red-600">
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    ) },
  ];

  const catColumns: DataTableColumn<ServiceCategoryRow>[] = [
    { key: 'name', label: 'Category', sortable: true, render: (r) =>
      editCat === r.id ? (
        <div className="flex gap-1.5">
          <input type="text" autoFocus value={catDraft.name} aria-label="Category name" onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} className="input w-32 py-1.5 text-sm" />
          <input type="text" value={catDraft.slug} aria-label="Category slug" onChange={(e) => setCatDraft({ ...catDraft, slug: e.target.value })} className="input w-32 py-1.5 text-sm" />
          <button type="button" onClick={() => { setCats((prev) => prev.map((c) => (c.id === r.id ? { ...c, ...catDraft } : c))); setEditCat(null); showToast('Category updated'); }} className="btn-primary text-xs">Save</button>
        </div>
      ) : (
        <span className="font-medium text-slate-900">{r.name}</span>
      ) },
    { key: 'slug', label: 'Slug', render: (r) => <span className="font-mono text-xs text-slate-500">{r.slug}</span> },
    { key: 'serviceCount', label: 'Services', sortable: true },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch checked={r.active} onChange={(v) => setCats((prev) => prev.map((c) => (c.id === r.id ? { ...c, active: v } : c)))} label={`${r.name} active`} hideLabel />
    ) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => { setEditCat(r.id); setCatDraft({ name: r.name, slug: r.slug }); }} className="btn-secondary text-xs">Edit</button>
        {r.serviceCount > 0 ? (
          <span className="group relative inline-flex">
            <button type="button" disabled className="btn-secondary cursor-not-allowed text-xs text-slate-400">
              <IconTrash className="h-3.5 w-3.5" />
            </button>
            <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-1 hidden w-52 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white group-hover:block">
              Cannot delete — {r.serviceCount} active services use this category.
            </span>
          </span>
        ) : (
          <button type="button" onClick={() => setDeleteTarget({ kind: 'category', id: r.id, name: r.name })} className="btn-secondary text-xs text-red-600">
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ) },
  ];

  const tplColumns: DataTableColumn<TemplateRow>[] = [
    { key: 'thumb', label: 'Preview', render: (r) => <div className={`h-10 w-14 rounded ${r.color}`} aria-hidden /> },
    { key: 'name', label: 'Template', sortable: true, render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'usageCount', label: 'Uses', sortable: true },
    { key: 'active', label: 'Active', render: (r) => (
      <ToggleSwitch checked={r.active} onChange={(v) => setTemplates((prev) => prev.map((t) => (t.id === r.id ? { ...t, active: v } : t)))} label={`${r.name} active`} hideLabel />
    ) },
    { key: 'actions', label: 'Actions', render: (r) => (
      <button type="button" onClick={() => setDeleteTarget({ kind: 'template', id: r.id, name: r.name })} className="btn-secondary text-xs text-red-600">
        <IconTrash className="h-3.5 w-3.5" />
      </button>
    ) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content</h1>
        <p className="mt-1 text-sm text-slate-600">Homepage banners, categories, templates and FAQs.</p>
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
        <DataTable data={cats} columns={catColumns} isLoading={catsQ.isLoading} searchable searchPlaceholder="Search categories" caption="Service categories" emptyMessage="No categories." />
      )}

      {tab === 'Templates' && (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setTplModal(true)} className="btn-primary"><IconPlus className="h-4 w-4" /> Upload template</button>
          </div>
          <DataTable data={templates} columns={tplColumns} isLoading={tplQ.isLoading} searchable searchPlaceholder="Search templates" caption="Design templates" emptyMessage="No templates." />
        </>
      )}

      {tab === 'FAQs' && (
        <div className="space-y-3">
          {faqs.map((cat) => (
            <div key={cat.id} className="card overflow-hidden">
              <button type="button" onClick={() => setOpenFaq(openFaq === cat.id ? null : cat.id)} aria-expanded={openFaq === cat.id}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                <span className="font-semibold text-slate-900">{cat.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{cat.items.length} questions</span>
                  <IconChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openFaq === cat.id ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {openFaq === cat.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2">
                    {cat.items.map((item, i) => (
                      <div key={item.id} className="rounded-lg bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.answer}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" onClick={() => setFaqs((prev) => prev.map((c) => (c.id === cat.id ? { ...c, items: move(c.items, i, -1) } : c)))} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label={`Move "${item.question}" up`}>
                              <IconArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setFaqs((prev) => prev.map((c) => (c.id === cat.id ? { ...c, items: move(c.items, i, 1) } : c)))} disabled={i === cat.items.length - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label={`Move "${item.question}" down`}>
                              <IconArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setDeleteTarget({ kind: `faq:${cat.id}`, id: item.id, name: item.question })} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete "${item.question}"`}>
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {faqForm?.catId === cat.id ? (
                    <form
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!faqForm.q.trim()) return;
                        setFaqs((prev) => prev.map((c) => (c.id === cat.id ? { ...c, items: [...c.items, { id: `q-${Date.now()}`, question: faqForm.q.trim(), answer: faqForm.a.trim() }] } : c)));
                        showToast('FAQ added');
                        setFaqForm(null);
                      }}
                      className="mt-3 space-y-2 rounded-lg bg-white p-3"
                    >
                      <div>
                        <label htmlFor="faq-q" className="label text-xs">Question</label>
                        <input id="faq-q" type="text" autoFocus value={faqForm.q} onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })} className="input py-2 text-sm" />
                      </div>
                      <div>
                        <label htmlFor="faq-a" className="label text-xs">Answer</label>
                        <textarea id="faq-a" rows={2} value={faqForm.a} onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })} className="input resize-none py-2 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs">Add FAQ</button>
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

      <Modal open={bannerModal} title="Add banner" onClose={() => setBannerModal(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!bannerForm.title.trim()) return;
            setBanners((prev) => [...prev, { id: `BN-${Date.now()}`, title: bannerForm.title.trim(), linkUrl: bannerForm.linkUrl.trim() || '/', active: bannerForm.active, color: 'from-slate-500 to-slate-700' }]);
            showToast('Banner added');
            setBannerForm({ title: '', linkUrl: '', active: true });
            setBannerModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="bn-title" className="label">Title</label>
            <input id="bn-title" type="text" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="input" />
          </div>
          <div>
            <label htmlFor="bn-image" className="label">Banner image</label>
            <input id="bn-image" type="file" accept="image/*" className="input py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Upload is stubbed in this build.</p>
          </div>
          <div>
            <label htmlFor="bn-link" className="label">Link URL</label>
            <input id="bn-link" type="text" value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} placeholder="/stores?q=banners" className="input" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Active</span>
            <ToggleSwitch checked={bannerForm.active} onChange={(v) => setBannerForm({ ...bannerForm, active: v })} label="Banner active" hideLabel />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setBannerModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add banner</button>
          </div>
        </form>
      </Modal>

      <Modal open={tplModal} title="Upload template" onClose={() => setTplModal(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!tplForm.name.trim()) return;
            setTemplates((prev) => [...prev, { id: `TPL-${Date.now()}`, name: tplForm.name.trim(), category: tplForm.category || cats[0]?.name || 'Documents', usageCount: 0, active: true, color: 'bg-slate-300' }]);
            showToast('Template uploaded');
            setTplForm({ name: '', category: '' });
            setTplModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="tpl-file" className="label">Template file</label>
            <input id="tpl-file" type="file" className="input py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Upload is stubbed in this build.</p>
          </div>
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
            <button type="button" onClick={() => setTplModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Upload</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this item?"
        message={`"${deleteTarget?.name ?? ''}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const { kind, id } = deleteTarget;
          if (kind === 'banner') setBanners((prev) => prev.filter((b) => b.id !== id));
          else if (kind === 'category') setCats((prev) => prev.filter((c) => c.id !== id));
          else if (kind === 'template') setTemplates((prev) => prev.filter((t) => t.id !== id));
          else if (kind.startsWith('faq:')) {
            const catId = kind.split(':')[1];
            setFaqs((prev) => prev.map((c) => (c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== id) } : c)));
          }
          showToast('Deleted');
          setDeleteTarget(null);
        }}
      />

      {tab === 'Service categories' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <IconHelpCircle className="h-3.5 w-3.5" /> Categories with active services cannot be deleted.
        </p>
      )}
    </div>
  );
}
