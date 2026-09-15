import type { Request, Response } from 'express';
import type {
  AdminTokenPayload,
  CustomerTokenPayload,
  SellerTokenPayload,
  TokenPayload,
} from '../../utils/jwt';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as complaintsService from './complaints.service';
import type { Actor } from './complaints.service';

/** /api/complaints — dispute flow (customer → seller → admin final). */

function actorOf(req: Request): Actor {
  const user = req.user as TokenPayload;
  if (user.role === 'SELLER') {
    const seller = user as SellerTokenPayload;
    return { role: 'SELLER', userId: seller.userId, sellerId: seller.sellerId };
  }
  if (user.role === 'ADMIN') {
    return { role: 'ADMIN', userId: (user as AdminTokenPayload).adminId };
  }
  return { role: 'CUSTOMER', userId: (user as CustomerTokenPayload).userId };
}

function customerIdOf(req: Request): string {
  return (req.user as CustomerTokenPayload).userId;
}

export const create = asyncHandler(async (req, res: Response) => {
  const complaint = await complaintsService.createComplaint(customerIdOf(req), {
    orderId: req.body.orderId,
    type: req.body.type,
    description: req.body.description,
    photoUrls: req.body.photoUrls ?? [],
    videoUrl: req.body.videoUrl ?? null,
  });
  res.status(201).json(new ApiResponse(201, complaint, 'Claim filed — the store has been notified'));
});

export const listMine = asyncHandler(async (req, res: Response) => {
  const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
  const complaints = await complaintsService.listCustomerComplaints(customerIdOf(req), orderId);
  res.status(200).json(new ApiResponse(200, complaints, 'Complaints fetched'));
});

export const listSeller = asyncHandler(async (req, res: Response) => {
  const actor = actorOf(req);
  const complaints = await complaintsService.listSellerComplaints(actor.sellerId!);
  res.status(200).json(new ApiResponse(200, complaints, 'Complaints fetched'));
});

export const listAdmin = asyncHandler(async (req, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const complaints = await complaintsService.listAdminComplaints(status);
  res.status(200).json(new ApiResponse(200, complaints, 'Complaints fetched'));
});

export const detail = asyncHandler(async (req, res: Response) => {
  const result = await complaintsService.getComplaintDetail(actorOf(req), req.params.id);
  res.status(200).json(new ApiResponse(200, result, 'Complaint fetched'));
});

export const escalate = asyncHandler(async (req, res: Response) => {
  const complaint = await complaintsService.customerEscalate(customerIdOf(req), req.params.id, {
    reason: req.body?.reason,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Escalated to admin review'));
});

export const accept = asyncHandler(async (req, res: Response) => {
  const actor = actorOf(req);
  const complaint = await complaintsService.sellerAccept(actor.sellerId!, req.params.id, {
    sealIntact: req.body?.sealIntact,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Claim accepted — refund triggered'));
});

export const reject = asyncHandler(async (req, res: Response) => {
  const actor = actorOf(req);
  const complaint = await complaintsService.sellerReject(actor.sellerId!, req.params.id, {
    reason: req.body?.reason ?? '',
    sealIntact: req.body?.sealIntact,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Claim rejected'));
});

export const refund = asyncHandler(async (req, res: Response) => {
  const complaint = await complaintsService.adminRefund(actorOf(req).userId, req.params.id, {
    note: req.body?.note,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Dispute finalized — refund issued'));
});

export const close = asyncHandler(async (req, res: Response) => {
  const complaint = await complaintsService.adminClose(actorOf(req).userId, req.params.id, {
    note: req.body?.note,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Dispute finalized — closed'));
});

export const setSeal = asyncHandler(async (req, res: Response) => {
  const complaint = await complaintsService.adminSetSealIntact(req.params.id, {
    intact: req.body?.intact === true,
  });
  res.status(200).json(new ApiResponse(200, complaint, 'Seal check recorded'));
});
