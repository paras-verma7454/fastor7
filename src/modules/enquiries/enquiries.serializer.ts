import type { Enquiry } from '../../db/schema.js';

export function serializeEnquiry(enquiry: Enquiry) {
  return {
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    courseInterest: enquiry.courseInterest,
    message: enquiry.message,
    source: enquiry.source,
    claimedBy: enquiry.claimedBy,
    claimedAt: enquiry.claimedAt?.toISOString() ?? null,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
  };
}
