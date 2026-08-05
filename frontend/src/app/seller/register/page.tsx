'use client';

import { useEffect, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import {
  GST_REGEX,
  IFSC_REGEX,
  INITIAL_BANK_DETAILS,
  INITIAL_STORE_INFO,
  PAN_REGEX,
  PHONE_REGEX,
  PINCODE_REGEX,
  REQUIRED_DOCUMENTS,
  SELLER_DRAFT_KEY,
  EMAIL_REGEX,
  type BankDetails,
  type DocumentType,
  type PricingEntry,
  type PricingUnit,
  type SelectedService,
  type SellerRegistrationState,
  type StoreInfo,
} from '@/lib/seller-types';
import SellerStepper from '@/components/seller-onboarding/SellerStepper';
import StoreInfoStep from '@/components/seller-onboarding/StoreInfoStep';
import ServicesStep from '@/components/seller-onboarding/ServicesStep';
import PricingSetupStep from '@/components/seller-onboarding/PricingSetupStep';
import BankDetailsStep from '@/components/seller-onboarding/BankDetailsStep';
import DocumentUploadStep from '@/components/seller-onboarding/DocumentUploadStep';
import ReviewSubmitStep from '@/components/seller-onboarding/ReviewSubmitStep';
import { IconArrowLeft, IconArrowRight, IconCheckCircle, IconX } from '@/components/icons';
import { registerSeller, uploadSellerDocuments } from '@/lib/api/seller-registration';

const TOTAL_STEPS = 5;

type Action =
  | { type: 'UPDATE_STORE_INFO'; payload: Partial<StoreInfo> }
  | { type: 'UPDATE_SERVICES'; payload: SelectedService }
  | { type: 'UPDATE_PRICING'; payload: { serviceId: string; patch: Partial<PricingEntry> } }
  | { type: 'SET_ALL_UNITS'; payload: PricingUnit }
  | { type: 'UPDATE_BANK_DETAILS'; payload: Partial<BankDetails> }
  | { type: 'UPDATE_DOC'; payload: { type: DocumentType; file: File | null } }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'HYDRATE_DRAFT'; payload: SellerRegistrationState };

const initialState: SellerRegistrationState = {
  storeInfo: INITIAL_STORE_INFO,
  selectedServices: [],
  pricing: [],
  bankDetails: INITIAL_BANK_DETAILS,
  documents: REQUIRED_DOCUMENTS,
  currentStep: 1,
};

function reducer(state: SellerRegistrationState, action: Action): SellerRegistrationState {
  switch (action.type) {
    case 'UPDATE_STORE_INFO':
      return { ...state, storeInfo: { ...state.storeInfo, ...action.payload } };

    case 'UPDATE_SERVICES': {
      const exists = state.selectedServices.some(
        (service) => service.serviceId === action.payload.serviceId,
      );

      if (exists) {
        // Deselecting a service also drops its pricing row.
        return {
          ...state,
          selectedServices: state.selectedServices.filter(
            (service) => service.serviceId !== action.payload.serviceId,
          ),
          pricing: state.pricing.filter((entry) => entry.serviceId !== action.payload.serviceId),
        };
      }

      return {
        ...state,
        selectedServices: [...state.selectedServices, action.payload],
        pricing: [
          ...state.pricing,
          {
            serviceId: action.payload.serviceId,
            serviceName: action.payload.serviceName,
            basePrice: 0,
            unit: 'per piece',
          },
        ],
      };
    }

    case 'UPDATE_PRICING':
      return {
        ...state,
        pricing: state.pricing.map((entry) =>
          entry.serviceId === action.payload.serviceId
            ? { ...entry, ...action.payload.patch }
            : entry,
        ),
      };

    case 'SET_ALL_UNITS':
      return {
        ...state,
        pricing: state.pricing.map((entry) => ({ ...entry, unit: action.payload })),
      };

    case 'UPDATE_BANK_DETAILS':
      return { ...state, bankDetails: { ...state.bankDetails, ...action.payload } };

    case 'UPDATE_DOC':
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.type === action.payload.type 
            ? { ...doc, file: action.payload.file, fileName: action.payload.file?.name ?? null } 
            : doc,
        ),
      };

    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'HYDRATE_DRAFT':
      return action.payload;

    default:
      return state;
  }
}

export default function SellerRegisterPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [state, dispatch] = useReducer(reducer, initialState);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/seller/register')}`);
    }
  }, [user, router]);

  const [storeErrors, setStoreErrors] = useState<Partial<Record<keyof StoreInfo, string>>>({});
  const [bankErrors, setBankErrors] = useState<Partial<Record<keyof BankDetails, string>>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [maxReached, setMaxReached] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Restore any saved draft on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELLER_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as SellerRegistrationState;
        dispatch({ type: 'HYDRATE_DRAFT', payload: draft });
        setMaxReached(draft.currentStep);
        setDraftRestored(true);
      }
    } catch {
      sessionStorage.removeItem(SELLER_DRAFT_KEY);
    }
    setHydrated(true);
  }, []);

  // Persist the draft on every change (after the initial hydration pass).
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SELLER_DRAFT_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

  useEffect(() => {
    setMaxReached((previous) => Math.max(previous, state.currentStep));
  }, [state.currentStep]);

  const validateStoreInfo = () => {
    const info = state.storeInfo;
    const errors: Partial<Record<keyof StoreInfo, string>> = {};

    if (!info.storeName.trim()) errors.storeName = 'Store name is required';
    if (!info.ownerName.trim()) errors.ownerName = 'Owner name is required';

    if (!info.email.trim()) errors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(info.email.trim())) errors.email = 'Enter a valid email';

    if (!info.phone.trim()) errors.phone = 'Phone number is required';
    else if (!PHONE_REGEX.test(info.phone.replace(/\D/g, '').slice(-10)))
      errors.phone = 'Enter a valid 10-digit mobile number';

    if (!info.businessType) errors.businessType = 'Select a business type';

    if (!info.gstNumber.trim()) errors.gstNumber = 'GST number is required';
    else if (!GST_REGEX.test(info.gstNumber.trim())) errors.gstNumber = 'Enter a valid 15-character GSTIN';

    if (!info.storeAddress.trim()) errors.storeAddress = 'Address is required';
    if (!info.city.trim()) errors.city = 'City is required';
    if (!info.state.trim()) errors.state = 'State is required';

    if (!info.pincode.trim()) errors.pincode = 'Pincode is required';
    else if (!PINCODE_REGEX.test(info.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';

    if (!info.openingTime) errors.openingTime = 'Opening time is required';
    if (!info.closingTime) errors.closingTime = 'Closing time is required';
    if (info.openingTime && info.closingTime && info.openingTime >= info.closingTime) {
      errors.closingTime = 'Closing time must be after opening time';
    }

    setStoreErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBankDetails = () => {
    const bank = state.bankDetails;
    const errors: Partial<Record<keyof BankDetails, string>> = {};

    if (!bank.accountHolderName.trim()) errors.accountHolderName = 'Account holder name is required';

    if (!bank.accountNumber.trim()) errors.accountNumber = 'Account number is required';
    else if (bank.accountNumber.length < 9) errors.accountNumber = 'Enter a valid account number';

    if (!bank.confirmAccountNumber.trim()) errors.confirmAccountNumber = 'Please confirm the account number';
    else if (bank.confirmAccountNumber !== bank.accountNumber)
      errors.confirmAccountNumber = 'Account numbers do not match';

    if (!bank.ifscCode.trim()) errors.ifscCode = 'IFSC code is required';
    else if (!IFSC_REGEX.test(bank.ifscCode.trim())) errors.ifscCode = 'Enter a valid IFSC code';

    if (!bank.panNumber.trim()) errors.panNumber = 'PAN number is required';
    else if (!PAN_REGEX.test(bank.panNumber.trim())) errors.panNumber = 'Enter a valid PAN number';

    setBankErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep = (step: number): boolean => {
    setStepError(null);

    if (step === 1) return validateStoreInfo();

    if (step === 2) {
      if (state.selectedServices.length === 0) {
        setStepError('Select at least one service you offer');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const invalid = state.pricing.filter((entry) => !entry.basePrice || entry.basePrice <= 0);
      if (invalid.length > 0) {
        setStepError(`Set a price for all ${state.pricing.length} services`);
        return false;
      }
      return true;
    }

    if (step === 4) return validateBankDetails();

    if (step === 5) {
      const missing = state.documents.filter((doc) => !doc.file);
      if (missing.length > 0) {
        setStepError(`Upload all ${state.documents.length} required documents`);
        return false;
      }
      return true;
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep(state.currentStep)) return;

    if (state.currentStep < TOTAL_STEPS) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!showReview) {
      setShowReview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submit();
    }
  };

  const goBack = () => {
    if (showReview) {
      setShowReview(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submit = async () => {
    if (!agreed) {
      setStepError('Please accept the seller terms to submit');
      return;
    }
    setSubmitting(true);
    setStepError(null);

    try {
      // 1. Create the seller application
      const storeInfo = state.storeInfo;
      await registerSeller({
        storeName: storeInfo.storeName,
        ownerName: storeInfo.ownerName,
        email: storeInfo.email,
        phone: storeInfo.phone.replace(/\D/g, '').slice(-10),
        gstNumber: storeInfo.gstNumber || undefined,
        businessType: storeInfo.businessType,
        storeAddress: storeInfo.storeAddress,
        city: storeInfo.city,
        state: storeInfo.state,
        pincode: storeInfo.pincode,
        openingTime: storeInfo.openingTime,
        closingTime: storeInfo.closingTime,
        services: state.pricing.map((p) => ({
          categoryId: state.selectedServices.find(s => s.serviceId === p.serviceId)?.categoryId || 'other',
          categoryName: state.selectedServices.find(s => s.serviceId === p.serviceId)?.serviceName || 'Other',
          serviceId: p.serviceId,
          serviceName: p.serviceName,
          basePrice: Number(p.basePrice),
          unit: p.unit
        })),
        bankDetails: {
          accountHolderName: state.bankDetails.accountHolderName,
          accountNumber: state.bankDetails.accountNumber,
          ifscCode: state.bankDetails.ifscCode,
          panNumber: state.bankDetails.panNumber,
        }
      });

      // 2. Upload documents
      const formData = new FormData();
      state.documents.forEach((doc) => {
        if (doc.file) {
          formData.append(doc.type, doc.file);
        }
      });

      await uploadSellerDocuments(formData);

      // Success!
      sessionStorage.removeItem(SELLER_DRAFT_KEY);
      router.push('/seller/pending');
    } catch (err: any) {
      setStepError(err.message || 'Failed to submit application. Please try again.');
      setSubmitting(false);
    }
  };

  const discardDraft = () => {
    try {
      sessionStorage.removeItem(SELLER_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'HYDRATE_DRAFT', payload: initialState });
    setMaxReached(1);
    setDraftRestored(false);
    setShowReview(false);
  };

  return (
    <div>
      <div className="card mb-6 p-5">
        <SellerStepper
          current={state.currentStep}
          maxReached={maxReached}
          onStepClick={(step) => {
            setShowReview(false);
            dispatch({ type: 'SET_STEP', payload: step });
          }}
        />
      </div>

      {draftRestored && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-green-50 px-4 py-3">
          <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p className="flex-1 text-sm text-green-800">
            We restored your saved progress. Continue where you left off.
          </p>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 text-xs font-semibold text-green-700 underline-offset-2 hover:underline"
          >
            Start fresh
          </button>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            className="shrink-0 rounded p-1 text-green-600 hover:bg-green-100"
            aria-label="Dismiss"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="card p-6">
        {showReview ? (
          <ReviewSubmitStep
            state={state}
            agreed={agreed}
            onAgreedChange={setAgreed}
            onEditStep={(step) => {
              setShowReview(false);
              dispatch({ type: 'SET_STEP', payload: step });
            }}
            error={stepError}
          />
        ) : (
          <>
            {state.currentStep === 1 && (
              <StoreInfoStep
                storeInfo={state.storeInfo}
                errors={storeErrors}
                onChange={(patch) => dispatch({ type: 'UPDATE_STORE_INFO', payload: patch })}
              />
            )}
            {state.currentStep === 2 && (
              <ServicesStep
                selected={state.selectedServices}
                onToggle={(service) => dispatch({ type: 'UPDATE_SERVICES', payload: service })}
                error={stepError}
              />
            )}
            {state.currentStep === 3 && (
              <PricingSetupStep
                pricing={state.pricing}
                onUpdate={(serviceId, patch) =>
                  dispatch({ type: 'UPDATE_PRICING', payload: { serviceId, patch } })
                }
                onSetAllUnits={(unit) => dispatch({ type: 'SET_ALL_UNITS', payload: unit })}
                error={stepError}
              />
            )}
            {state.currentStep === 4 && (
              <BankDetailsStep
                bankDetails={state.bankDetails}
                errors={bankErrors}
                onChange={(patch) => dispatch({ type: 'UPDATE_BANK_DETAILS', payload: patch })}
              />
            )}
            {state.currentStep === 5 && (
              <DocumentUploadStep
                documents={state.documents}
                onUpload={(type, file) => dispatch({ type: 'UPDATE_DOC', payload: { type, file } })}
                error={stepError}
              />
            )}
          </>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={(state.currentStep === 1 && !showReview) || submitting}
            className="btn-secondary"
          >
            <IconArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:block">Progress saves automatically</span>
            <button type="button" onClick={goNext} disabled={submitting} className="btn-primary">
              {submitting ? (
                'Submitting…'
              ) : showReview ? (
                'Submit application'
              ) : state.currentStep === TOTAL_STEPS ? (
                <>
                  Review <IconArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue <IconArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
