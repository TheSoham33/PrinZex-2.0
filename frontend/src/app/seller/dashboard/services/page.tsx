'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSellerServices,
  addSellerService,
  deleteSellerService,
} from '@/lib/api/seller-services';
import { SERVICE_CATEGORIES } from '@/lib/seller-types';
import { useToast } from '@/components/seller-dashboard/Toast';
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconRefreshCw,
} from '@/components/icons';

export default function ManageServicesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'documents',
  ]);

  const {
    data: myServices = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['seller-my-services'],
    queryFn: fetchSellerServices,
  });

  const addMutation = useMutation({
    mutationFn: addSellerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      showToast('Service added to your shop');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSellerService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-my-services'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pricing'] });
      showToast('Service removed from your shop');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories((previous) =>
      previous.includes(id)
        ? previous.filter((category) => category !== id)
        : [...previous, id],
    );
  };

  const handleToggleService = (
    categoryId: string,
    categoryName: string,
    serviceId: string,
    serviceName: string,
  ) => {
    const existing = myServices.find(
      (service) => service.serviceId === serviceId,
    );
    if (existing) {
      if (
        confirm(
          `Remove "${serviceName}" from your shop? Any active orders will still use the old settings.`,
        )
      ) {
        deleteMutation.mutate(existing.id);
      }
      return;
    }

    // Prices are intentionally configured on the Pricing page. The API still
    // needs an initial positive value when a service is selected.
    addMutation.mutate({
      categoryId,
      categoryName,
      serviceId,
      serviceName,
      basePrice: 1,
      unit:
        serviceId === 'doc-print' || serviceId === 'doc-xerox'
          ? 'per page'
          : 'per piece',
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <IconAlertCircle className="h-8 w-8 text-red-500" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Couldn&apos;t load services
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

  const isMutating = addMutation.isPending || deleteMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Manage Services
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Select the services your shop offers. Configure all rates and
          customisation prices on the Pricing page.
        </p>
      </header>

      <div className="space-y-4">
        {SERVICE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const selectedInCategory = category.services.filter((service) =>
            myServices.some((selected) => selected.serviceId === service.id),
          ).length;

          return (
            <div key={category.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center justify-between bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100"
              >
                <div>
                  <h2 className="font-bold text-slate-900">{category.name}</h2>
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
                    const isSelected = myServices.some(
                      (selected) => selected.serviceId === service.id,
                    );

                    return (
                      <label
                        key={service.id}
                        htmlFor={`check-${service.id}`}
                        className="flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          id={`check-${service.id}`}
                          checked={isSelected}
                          disabled={isMutating}
                          onChange={() =>
                            handleToggleService(
                              category.id,
                              category.name,
                              service.id,
                              service.name,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {service.name}
                        </span>
                      </label>
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
