// Stripe helpers — billing and usage metering
// TODO: implement when Stripe is configured

export async function reportAppointmentToStripe(
  clinicId: string,
  appointmentId: string
): Promise<boolean> {
  // TODO: report usage event to Stripe metered billing
  console.log('Stripe usage report:', { clinicId, appointmentId })
  return true
}

export async function getSubscriptionStatus(stripeCustomerId: string) {
  // TODO: fetch subscription details from Stripe
  return null
}
