import type { RequestHandler } from 'express';
import { currentUser } from '../../middleware/auth.js';
import { validated } from '../../middleware/validate.js';
import { AppError } from '../../utils/errors.js';
import type { EnquiryIdParams, ListQuery } from './enquiries.schemas.js';
import { serializeEnquiry } from './enquiries.serializer.js';
import {
  claim,
  findOwnership,
  listClaimedBy,
  listUnclaimed,
} from './enquiries.repository.js';

export const unclaimed: RequestHandler = async (req, res) => {
  const query = validated<ListQuery>(req, 'query');
  const { rows, meta } = await listUnclaimed(query);

  res.status(200).json({ data: rows.map(serializeEnquiry), meta });
};

export const claimed: RequestHandler = async (req, res) => {
  const query = validated<ListQuery>(req, 'query');
  const { rows, meta } = await listClaimedBy(currentUser(req).id, query);

  res.status(200).json({ data: rows.map(serializeEnquiry), meta });
};

export const claimOne: RequestHandler = async (req, res) => {
  const user = currentUser(req);
  const { id } = validated<EnquiryIdParams>(req, 'params');

  const claimedEnquiry = await claim(id, user.id);
  if (claimedEnquiry) {
    res.status(200).json({ data: serializeEnquiry(claimedEnquiry) });
    return;
  }

  // Zero rows means either the lead is gone or someone else won the race.
  // Only the losing path pays for the extra lookup.
  const ownership = await findOwnership(id);

  if (!ownership) {
    throw AppError.notFound('Enquiry not found');
  }

  throw AppError.conflict(
    'ALREADY_CLAIMED',
    ownership.claimedBy === user.id
      ? 'You have already claimed this enquiry'
      : 'This enquiry has already been claimed by another counselor',
    { claimedByMe: ownership.claimedBy === user.id },
  );
};
