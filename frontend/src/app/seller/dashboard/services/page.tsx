'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchSellerServices, 
  addSellerService, 
  updateSellerService, 
  deleteSellerService 
} from '@/lib/api/seller-services';
import { SERVICE_CATEGORIES, PRICING_UNITS } from '@/lib/seller-types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/seller-dashboard/Toast';
import { 
  IconAlertCircle, 
  IconCheckCircle, 
  IconRefreshCw, 
  IconChevronDown, 
  IconChevronUp,
  IconPlus,
  IconTrash
} from '@/components/icons';

export default function ManageServicesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['documents']);

  const { data: myServices = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-my-services'],
    queryFn: fetchSellerServices,
  });

  const [localPrices, setLocalPrices] = useState<Record<string, { price: string; unit: string }>>({});

  useEffect(() => {
    if (myServices.length > 0) {
      const prices: Record<string, { price: string; unit: string }> = {};
      myServices.forEach(s => {
        prices[s.serviceId] = { price: String(s.basePrice), unit: s.unit };
      });
      setLocalPrices(prev => ({ ...prev, ...prices }));
    }
  }, [myServices]);

  const addMutation = useMutation({
    mutationFn: addSellerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Service added to your shop');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSellerService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Price updated');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSellerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      showToast('Service removed from your shop');
    },
    onError: (err: any) => showToast(err.message, 'error'),
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleToggleService = (catId: string, catName: string, serviceId: string, serviceName: string) => {
    const existing = myServices.find(s => s.serviceId === serviceId);
    if (existing) {
      if (confirm(`Remove "${serviceName}" from your shop? Any active orders will still use the old settings.`)) {
        deleteMutation.mutate(existing.id);
      }
    } else {
      addMutation.mutate({
        categoryId: catId,
        categoryName: catName,
        serviceId,
        serviceName,
        basePrice: 1, // Default initial price
        unit: 'per page'
      });
    }
  };

  const handleUpdatePrice = (serviceId: string) => {
    const existing = myServices.find(s => s.serviceId === serviceId);
    const local = localPrices[serviceId];
    if (!existing || !local) return;

    updateMutation.mutate({
      id: existing.id,
      data: {
        basePrice: Number(local.price),
        unit: local.unit
      }
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-96 animate-pulse bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Services</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose which services your shop offers and set your base rates.
        </p>
      </header>

      <div className="space-y-4">
        {SERVICE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const selectedInCategory = category.services.filter(s => 
            myServices.some(my => my.serviceId === s.id)
          ).length;

          return (
            <div key={category.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div>
                  <h3 className="font-bold text-slate-900">{category.name}</h3>
                  <p className="text-xs text-slate-500">
                    {category.description} · {selectedInCategory} selected
                  </p>
                </div>
                {isExpanded ? (
                  <IconChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <IconChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-200">
                  {category.services.map((service) => {
                    const myService = myServices.find(s => s.serviceId === service.id);
                    const isSelected = !!myService;
                    const local = localPrices[service.id] || { price: '0', unit: 'per page' };
                    const isChanged = myService && (
                      String(myService.basePrice) !== local.price || 
                      myService.unit !== local.unit
                    );

                    return (
                      <div key={service.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <div className="flex flex-1 items-center gap-3 min-w-[15rem]">
                          <input
                            type="checkbox"
                            id={`check-${service.id}`}
                            checked={isSelected}
                            onChange={() => handleToggleService(category.id, category.name, service.id, service.name)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`check-${service.id}`} className="text-sm font-semibold text-slate-900 cursor-pointer">
                            {service.name}
                          </label>
                        </div>

                        {isSelected && (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="w-24">
                              <label className="sr-only">Base Price</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={local.price}
                                  onChange={(e) => setLocalPrices(prev => ({
                                    ...prev,
                                    [service.id]: { ...local, price: e.target.value }
                                  }))}
                                  className="input py-1.5 pl-6 text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="w-32">
                              <label className="sr-only">Unit</label>
                              <select
                                value={local.unit}
                                onChange={(e) => setLocalPrices(prev => ({
                                  ...prev,
                                  [service.id]: { ...local, unit: e.target.value }
                                }))}
                                className="input py-1.5 text-xs"
                              >
                                {PRICING_UNITS.map(unit => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUpdatePrice(service.id)}
                              disabled={!isChanged || updateMutation.isPending}
                              className={`btn-primary px-3 py-1.5 text-xs ${!isChanged ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                              {updateMutation.isPending ? '...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
