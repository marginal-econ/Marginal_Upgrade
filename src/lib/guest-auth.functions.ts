import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/backend/client.server";

export interface GuestSessionPayload {
  email: string;
  otp: string;
}

/**
 * Creates an ephemeral confirmed guest user in Supabase and issues an OTP.
 * Allows prospective Cambridge students to test the real Essay Grader and MCQ Past Papers
 * directly without hitting a login barrier first.
 */
export const createGuestSession = createServerFn({ method: "POST" })
  .handler(async (): Promise<GuestSessionPayload> => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const guestEmail = `guest_${timestamp}_${random}@guest.marginal-econ.com`;

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true,
      user_metadata: {
        is_guest: true,
        full_name: "Guest Student",
        role: "student",
        tier: "free",
      },
    });

    if (createError || !userData?.user) {
      throw new Error(createError?.message || "Failed to create guest user session");
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: guestEmail,
    });

    const otp = linkData?.properties?.email_otp;
    if (linkError || !otp) {
      throw new Error(linkError?.message || "Failed to generate guest verification token");
    }

    return {
      email: guestEmail,
      otp,
    };
  });
