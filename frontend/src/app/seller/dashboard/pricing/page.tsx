'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSellerPricing,
  updateBulkPrices,
  updateBulkDiscounts,
  updatePricingOverrides,
} from '@/lib/api/seller-inventory';
import {
  type BulkTier,
  type SellerPricingEntry,
} from '@/lib/domain/seller-inventory';
import {
  COVER_COLORS,
  COVER_TEXT_COLORS,
  PAPER_SIZES,
  PAPER_TYPES,
  SPIRAL_COIL_TYPES,
  SPIRAL_COVER_TYPES,
  TWIN_LOOP_BACK_COVERS,
  TWIN_LOOP_FRONT_COVERS,
  TWIN_LOOP_WIRE_COLORS,
} from '@/lib/domain/stores';
import PricingEditor from '@/components/seller-dashboard/PricingEditor';
import HardBindingCustomizationOptions from '@/components/seller-dashboard/HardBindingCustomizationOptions';
import PaperCustomizationOptions from '@/components/seller-dashboard/PaperCustomizationOptions';
import SpiralBindingCustomizationPricing from '@/components/seller-dashboard/SpiralBindingCustomizationPricing';
import TwinLoopCustomizationPricing, {
  type TwinLoopPricingState,
} from '@/components/seller-dashboard/TwinLoopCustomizationPricing';
import ToggleSwitch from '@/components/seller-dashboard/ToggleSwitch';
import { useToast } from '@/components/seller-dashboard/Toast';
import { IconAlertCircle, IconPencil, IconRefreshCw } from '@/components/icons';

export default function SellerPricingPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-pricing'],
    queryFn: fetchSellerPricing,
  });

  const [pricing, setPricing] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [pageRate, setPageRate] = useState<{ bw: string; color: string }>({
    bw: '',
    color: '',
  });
  const [documentColorModes, setDocumentColorModes] = useState({
    bw: true,
    color: true,
  });
  // Each option carries an "offered" toggle + its extra price. Only offered
  // options are saved (and shown to customers on the store).
  const [coverTypeOptions, setCoverTypeOptions] = useState<
    Record<string, { price: string; enabled: boolean }>
  >({});
  const [coilOptions, setCoilOptions] = useState<
    Record<string, { price: string; enabled: boolean }>
  >({});
  const [coverColorOptions, setCoverColorOptions] = useState<
    Record<string, { price: string; enabled: boolean }>
  >({});
  const [hardCoverColors, setHardCoverColors] = useState<string[]>([]);
  const [hardFoilColors, setHardFoilColors] = useState<string[]>([]);
  const [servicePaperOptions, setServicePaperOptions] = useState<
    Record<
      string,
      {
        paperTypes: Record<string, number>;
        paperSizes: Record<string, number>;
      }
    >
  >({});
  const [twinLoopOptions, setTwinLoopOptions] = useState<TwinLoopPricingState>({
    wireColors: {},
    frontCovers: {},
    backCovers: {},
  });

  const [expandedServices, setExpandedServices] = useState<string[]>([]);
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [tierDraft, setTierDraft] = useState('');

  useEffect(() => {
    if (data) {
      setPricing(data.services || []);
      setTiers(data.bulkDiscountTiers || []);

      const overrides = (data as any).pricingOverrides || {};

      const documentPrinting = (data.services || []).find(
        (service: any) => service.serviceId === 'doc-print',
      );
      setPageRate({
        // The Document Printing base price is the canonical B&W page price.
        bw: String(documentPrinting?.basePrice ?? overrides.pageRate?.bw ?? ''),
        color: String(overrides.pageRate?.color ?? ''),
      });
      setDocumentColorModes({
        bw: overrides.documentColorModes?.bw ?? true,
        color: overrides.documentColorModes?.color ?? true,
      });

      const coverType = overrides.coverType ?? {};
      const ct: Record<string, { price: string; enabled: boolean }> = {};
      SPIRAL_COVER_TYPES.forEach((c) => {
        ct[c.value] = {
          price: String(coverType[c.value] ?? ''),
          enabled: coverType[c.value] !== undefined,
        };
      });
      setCoverTypeOptions(ct);

      const coilType = overrides.coilType ?? {};
      const cl: Record<string, { price: string; enabled: boolean }> = {};
      SPIRAL_COIL_TYPES.forEach((c) => {
        cl[c.value] = {
          price: String(coilType[c.value] ?? ''),
          enabled: coilType[c.value] !== undefined,
        };
      });
      setCoilOptions(cl);

      const coverColor = overrides.coverColor ?? {};
      const cc: Record<string, { price: string; enabled: boolean }> = {};
      COVER_COLORS.forEach((c) => {
        cc[c.value] = {
          price: String(coverColor[c.value] ?? ''),
          enabled: coverColor[c.value] !== undefined,
        };
      });
      setCoverColorOptions(cc);

      setHardCoverColors(
        overrides.hardCoverColors ?? COVER_COLORS.map((color) => color.value),
      );
      setHardFoilColors(
        overrides.hardFoilColors ??
          COVER_TEXT_COLORS.filter((color) => color.value !== 'white').map(
            (color) => color.value,
          ),
      );
      const defaultPaperTypes = Object.fromEntries(
        PAPER_TYPES.map((option) => [option.value, 0]),
      );
      const defaultPaperSizes = Object.fromEntries(
        PAPER_SIZES.map((option) => [option.value, 0]),
      );
      const savedPaperOptions = overrides.servicePaperOptions ?? {};
      setServicePaperOptions(
        Object.fromEntries(
          (data.services || []).map((service: any) => [
            service.serviceId,
            {
              paperTypes:
                savedPaperOptions[service.serviceId]?.paperTypes ??
                defaultPaperTypes,
              paperSizes:
                savedPaperOptions[service.serviceId]?.paperSizes ??
                defaultPaperSizes,
            },
          ]),
        ),
      );

      const savedTwinLoop = overrides.twinLoopOptions ?? {};
      setTwinLoopOptions({
        wireColors:
          savedTwinLoop.wireColors ??
          Object.fromEntries(
            TWIN_LOOP_WIRE_COLORS.map((option) => [option.value, 0]),
          ),
        frontCovers:
          savedTwinLoop.frontCovers ??
          Object.fromEntries(
            TWIN_LOOP_FRONT_COVERS.map((option) => [option.value, 0]),
          ),
        backCovers:
          savedTwinLoop.backCovers ??
          Object.fromEntries(
            TWIN_LOOP_BACK_COVERS.map((option) => [option.value, 0]),
          ),
        hangerPrice: savedTwinLoop.hangerPrice ?? 0,
        concealedPrice: savedTwinLoop.concealedPrice ?? 0,
      });
    }
  }, [data]);

  const updatePriceMutation = useMutation({
    mutationFn: updateBulkPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Price updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateTiersMutation = useMutation({
    mutationFn: updateBulkDiscounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      showToast('Bulk discount updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateOverridesMutation = useMutation({
    mutationFn: updatePricingOverrides,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Specifications pricing saved');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const savePrice = (
    serviceId: string,
    basePrice: number,
    unit: string,
    minPages: number | null,
  ) => {
    updatePriceMutation.mutate([{ serviceId, basePrice, unit, minPages }]);
  };

  const toggleServiceCustomizations = (serviceId: string) => {
    setExpandedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const saveTier = (index: number) => {
    const parsed = Number(tierDraft);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      const nextTiers = tiers.map((tier, i) =>
        i === index
          ? { ...tier, discountPct: parsed }
          : { minQty: tier.minQty, discountPct: tier.discountPct },
      );
      updateTiersMutation.mutate(nextTiers);
    }
    setEditingTier(null);
  };

  const handleSaveOverrides = () => {
    const documentPrinting = pricing.find(
      (service) => service.serviceId === 'doc-print',
    );
    const pageRatePayload = documentPrinting
      ? {
          bw: Number(pageRate.bw) || Number(documentPrinting.basePrice),
          color:
            Number(pageRate.color) || Number(documentPrinting.basePrice) * 2,
        }
      : undefined;

    const coverType: Record<string, number> = {};
    Object.entries(coverTypeOptions).forEach(([k, v]) => {
      if (v.enabled) coverType[k] = Number(v.price) || 0;
    });

    const coilType: Record<string, number> = {};
    Object.entries(coilOptions).forEach(([k, v]) => {
      if (v.enabled) coilType[k] = Number(v.price) || 0;
    });

    const coverColor: Record<string, number> = {};
    Object.entries(coverColorOptions).forEach(([k, v]) => {
      if (v.enabled) coverColor[k] = Number(v.price) || 0;
    });

    updateOverridesMutation.mutate({
      pageRate: pageRatePayload,
      documentColorModes,
      coverType,
      coilType,
      coverColor,
      hardCoverColors,
      hardFoilColors,
      servicePaperOptions,
      twinLoopOptions,
    });
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <IconAlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Couldn&apos;t load pricing
          </h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-primary mt-6"
          >
            <IconRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pricing
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Set your base rates, specification add-ons, and bulk discounts.
        </p>
      </header>

      {/* Service Rates */}
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Service base rates
          </h2>
        </div>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-slate-100" />
        ) : (
          pricing.map((entry) => (
            <div
              key={entry.id}
              className="border-b border-slate-100 last:border-0"
            >
              <PricingEditor
                entry={{
                  serviceId: entry.id,
                  serviceName: entry.serviceName,
                  basePrice: Number(entry.basePrice),
                  unit: entry.unit,
                  minPages: entry.minPages ?? null,
                }}
                onSave={savePrice}
                expanded={expandedServices.includes(entry.serviceId)}
                onToggle={() => toggleServiceCustomizations(entry.serviceId)}
              />

              {expandedServices.includes(entry.serviceId) && (
                <div
                  id={`service-customizations-${entry.serviceId}`}
                  className="animate-fade-in"
                >
                  <PaperCustomizationOptions
                    serviceName={entry.serviceName}
                    paperTypePrices={
                      servicePaperOptions[entry.serviceId]?.paperTypes ?? {}
                    }
                    paperSizePrices={
                      servicePaperOptions[entry.serviceId]?.paperSizes ?? {}
                    }
                    onPaperTypePricesChange={(paperTypes) =>
                      setServicePaperOptions((current) => ({
                        ...current,
                        [entry.serviceId]: {
                          paperTypes,
                          paperSizes:
                            current[entry.serviceId]?.paperSizes ?? {},
                        },
                      }))
                    }
                    onPaperSizePricesChange={(paperSizes) =>
                      setServicePaperOptions((current) => ({
                        ...current,
                        [entry.serviceId]: {
                          paperTypes:
                            current[entry.serviceId]?.paperTypes ?? {},
                          paperSizes,
                        },
                      }))
                    }
                    onSave={handleSaveOverrides}
                    saving={updateOverridesMutation.isPending}
                  />

                  {entry.serviceId === 'doc-print' && (
                    <div className="border-t border-slate-100 bg-blue-50/40 px-4 py-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-slate-900">
                          Document printing prices
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          The base price and B&amp;W printing price always stay
                          the same.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`text-sm ${documentColorModes.bw ? 'text-slate-700' : 'text-slate-400'}`}
                          >
                            B&amp;W printing
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                disabled={!documentColorModes.bw}
                                value={pageRate.bw}
                                onChange={(event) =>
                                  setPageRate((current) => ({
                                    ...current,
                                    bw: event.target.value,
                                  }))
                                }
                                className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
                              />
                            </div>
                            <ToggleSwitch
                              checked={documentColorModes.bw}
                              disabled={
                                documentColorModes.bw &&
                                !documentColorModes.color
                              }
                              label="Show B&W printing"
                              hideLabel
                              onChange={(bw) =>
                                setDocumentColorModes((current) => ({
                                  ...current,
                                  bw,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`text-sm ${documentColorModes.color ? 'text-slate-700' : 'text-slate-400'}`}
                          >
                            Color printing
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                disabled={!documentColorModes.color}
                                value={pageRate.color}
                                onChange={(event) =>
                                  setPageRate((current) => ({
                                    ...current,
                                    color: event.target.value,
                                  }))
                                }
                                className="input w-24 py-1 pl-6 text-right text-sm disabled:opacity-40"
                              />
                            </div>
                            <ToggleSwitch
                              checked={documentColorModes.color}
                              disabled={
                                documentColorModes.color &&
                                !documentColorModes.bw
                              }
                              label="Show color printing"
                              hideLabel
                              onChange={(color) =>
                                setDocumentColorModes((current) => ({
                                  ...current,
                                  color,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveOverrides}
                          disabled={
                            updateOverridesMutation.isPending ||
                            (!documentColorModes.bw &&
                              !documentColorModes.color)
                          }
                          className="btn-primary py-1.5 text-xs"
                        >
                          {updateOverridesMutation.isPending
                            ? 'Saving...'
                            : 'Save printing prices'}
                        </button>
                      </div>
                    </div>
                  )}

                  {entry.serviceId === 'bind-hard' && (
                    <HardBindingCustomizationOptions
                      coverColors={hardCoverColors}
                      foilColors={hardFoilColors}
                      onCoverColorsChange={setHardCoverColors}
                      onFoilColorsChange={setHardFoilColors}
                      onSave={handleSaveOverrides}
                      saving={updateOverridesMutation.isPending}
                    />
                  )}

                  {entry.serviceId === 'bind-spiral' && (
                    <SpiralBindingCustomizationPricing
                      coverTypeOptions={coverTypeOptions}
                      setCoverTypeOptions={setCoverTypeOptions}
                      coilOptions={coilOptions}
                      setCoilOptions={setCoilOptions}
                      coverColorOptions={coverColorOptions}
                      setCoverColorOptions={setCoverColorOptions}
                      onSave={handleSaveOverrides}
                      saving={updateOverridesMutation.isPending}
                    />
                  )}

                  {entry.serviceId === 'bind-twin-loop' && (
                    <TwinLoopCustomizationPricing
                      value={twinLoopOptions}
                      onChange={setTwinLoopOptions}
                      onSave={handleSaveOverrides}
                      saving={updateOverridesMutation.isPending}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Bulk Discounts */}
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Bulk order discounts
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-2.5">
                Quantity range
              </th>
              <th scope="col" className="px-4 py-2.5">
                Discount
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const isEditing = editingTier === index;
              const nextTier = tiers[index + 1];
              const displayMax =
                tier.maxQty || (nextTier ? nextTier.minQty - 1 : null);

              return (
                <tr
                  key={tier.minQty}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {displayMax === null
                      ? `${tier.minQty}+ units`
                      : `${tier.minQty}–${displayMax} units`}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          id={`tier-${index}`}
                          type="number"
                          min={0}
                          max={100}
                          value={tierDraft}
                          onChange={(e) => setTierDraft(e.target.value)}
                          className="input w-20 py-1.5 text-sm"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-900">
                        {tier.discountPct}% off
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveTier(index)}
                          className="btn-primary text-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTier(null)}
                          className="btn-secondary text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTierDraft(String(tier.discountPct));
                          setEditingTier(index);
                        }}
                        className="btn-secondary text-xs"
                      >
                        <IconPencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
