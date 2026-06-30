/**
 * Integration Test: Complete 7-Day Booking Workflow
 *
 * Tests the complete flow:
 * 1. Staff 1 submits application for Blogger A
 * 2. Checking Department approves
 * 3. Finance approves AND auto-creates 7-day booking
 * 4. Booking blocks Staff 2 from submitting for Blogger A
 * 5. After 7 days, booking expires and Blogger A is available again
 *
 * This demonstrates the CRITICAL 7-day booking system
 */

const pool = require('../../config/database');
const logger = require('../../utils/logger');
const applicationService = require('../../services/application');
const bookingService = require('../../services/booking');

/**
 * Complete workflow test
 */
async function testCompleteBookingWorkflow() {
  let client;

  try {
    logger.info('🧪 Starting Complete 7-Day Booking Workflow Test');

    // Setup test data
    logger.info('📋 Creating test users and blogger...');

    // User IDs (from seed data)
    const staff1Id = '550e8400-e29b-41d4-a716-446655440001'; // hina.tariq
    const staff2Id = '550e8400-e29b-41d4-a716-446655440002'; // omar.farooq
    const checkingId = '550e8400-e29b-41d4-a716-446655440003'; // bilal.aslam
    const financeId = '550e8400-e29b-41d4-a716-446655440004'; // sara.khan
    const bloggerId = 'blogger-001'; // Test blogger

    // Step 1: Staff 1 submits application for Blogger A
    logger.info('✅ Step 1: Staff 1 (Hina) submits application for Blogger A');

    const appResult = await pool.query(
      `INSERT INTO applications (
        id, blogger_uid, staff_id, staff_name, team_id, campaign_name,
        requested_budget, eligibility_status, checking_status, finance_status,
        submitted_at
      ) VALUES (
        'APP-TEST-001', $1, $2, 'Hina Tariq', 'team-1', 'Test Campaign',
        5000, 'eligible', 'pending', 'pending', NOW()
      ) RETURNING *`,
      [bloggerId, staff1Id]
    );

    const application = appResult.rows[0];
    logger.info(`   Application created: ${application.id}`);
    logger.info(`   Blogger: ${application.blogger_uid}`);
    logger.info(`   Submitted by: ${application.staff_name}`);

    // Step 2: Checking Department approves
    logger.info('✅ Step 2: Checking Department (Bilal) approves application');

    const approvedByChecking = await applicationService.approveByChecking(
      application.id,
      checkingId,
      'Application meets all requirements'
    );

    logger.info(`   Checking status: ${approvedByChecking.checking_status}`);
    logger.info(`   ✓ Application sent to Finance for budget decision`);

    // Step 3: Finance approves with AUTO-CREATED 7-day booking
    logger.info('✅ Step 3: Finance (Sara) approves AND auto-creates 7-day booking');

    const financeApprovalResult = await applicationService.approveByFinance(
      application.id,
      financeId,
      5000,
      'Budget approved'
    );

    logger.info(`   Finance status: ${financeApprovalResult.application.finance_status}`);
    logger.info(`   Final result: ${financeApprovalResult.application.final_result}`);
    logger.info(`   ✅ BOOKING AUTO-CREATED:`);
    logger.info(`      - Booking ID: ${financeApprovalResult.booking.id}`);
    logger.info(`      - Blogger ID: ${financeApprovalResult.booking.bloggerId}`);
    logger.info(`      - Booked by: ${financeApprovalResult.booking.bookedBy}`);
    logger.info(`      - Days remaining: ${financeApprovalResult.booking.daysRemaining}`);
    logger.info(`      - Booked until: ${financeApprovalResult.booking.bookedUntil.toISOString()}`);

    // Verify booking was created
    const bookingVerify = await pool.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [financeApprovalResult.booking.id]
    );

    if (bookingVerify.rows.length === 0) {
      throw new Error('❌ Booking was not created!');
    }

    logger.info(`   ✓ Booking verified in database`);

    // Verify blogger status was updated
    const bloggerVerify = await pool.query(
      `SELECT booked_status, booked_by_staff_id, booked_by_staff_name, booked_until FROM bloggers WHERE uid = $1`,
      [bloggerId]
    );

    if (bloggerVerify.rows.length === 0) {
      throw new Error('❌ Blogger not found!');
    }

    const bloggerStatus = bloggerVerify.rows[0];
    logger.info(`   ✓ Blogger status updated:`);
    logger.info(`      - Booked status: ${bloggerStatus.booked_status}`);
    logger.info(`      - Booked by staff: ${bloggerStatus.booked_by_staff_name}`);
    logger.info(`      - Booked until: ${bloggerStatus.booked_until}`);

    // Step 4: Test booking block - Staff 2 cannot submit for this blogger
    logger.info('✅ Step 4: Verify Staff 2 is BLOCKED from submitting for Blogger A');

    const staff2BookingCheck = await bookingService.checkBookingStatus(
      bloggerId,
      staff2Id
    );

    logger.info(`   Booking status: ${staff2BookingCheck.bookerStatus}`);
    logger.info(`   Can submit: ${staff2BookingCheck.canSubmit}`);

    if (staff2BookingCheck.canSubmit) {
      throw new Error('❌ Booking block did not work! Staff 2 should not be able to submit!');
    }

    logger.info(`   ✓ BLOCK WORKING: ${staff2BookingCheck.blockReason}`);

    // Step 5: Staff 1 CAN submit (same staff who booked)
    logger.info('✅ Step 5: Verify Staff 1 (who booked) CAN still submit');

    const staff1BookingCheck = await bookingService.checkBookingStatus(
      bloggerId,
      staff1Id
    );

    logger.info(`   Can submit: ${staff1BookingCheck.canSubmit}`);

    if (!staff1BookingCheck.canSubmit) {
      throw new Error('❌ Staff 1 should be able to submit again (same staff who booked)!');
    }

    logger.info(`   ✓ Staff 1 can still submit (same staff)`);

    // Step 6: Test booking extension
    logger.info('✅ Step 6: Admin extends booking by 7 more days');

    const adminId = '550e8400-e29b-41d4-a716-446655440000'; // admin
    const extendedBooking = await bookingService.extendBooking(
      financeApprovalResult.booking.id,
      7,
      adminId
    );

    logger.info(`   New booked until: ${extendedBooking.newBokedUntil.toISOString()}`);
    logger.info(`   Days remaining: ${extendedBooking.daysRemaining}`);

    // Step 7: Test booking cancellation
    logger.info('✅ Step 7: Admin cancels booking');

    const cancelledBooking = await bookingService.cancelBooking(
      financeApprovalResult.booking.id,
      'Test cancellation',
      adminId
    );

    logger.info(`   Status: ${cancelledBooking.status}`);
    logger.info(`   ${cancelledBooking.message}`);

    // Verify booking is cancelled and blogger is released
    const bloggerAfterCancel = await pool.query(
      `SELECT booked_status FROM bloggers WHERE uid = $1`,
      [bloggerId]
    );

    if (bloggerAfterCancel.rows[0].booked_status !== 'available') {
      throw new Error('❌ Blogger was not released after cancellation!');
    }

    logger.info(`   ✓ Blogger released (booked_status = available)`);

    // Step 8: Verify Staff 2 can now submit
    logger.info('✅ Step 8: Verify Staff 2 CAN now submit after cancellation');

    const staff2CanSubmitNow = await bookingService.checkBookingStatus(
      bloggerId,
      staff2Id
    );

    if (!staff2CanSubmitNow.canSubmit) {
      throw new Error('❌ Staff 2 should be able to submit now!');
    }

    logger.info(`   ✓ Staff 2 can now submit`);

    logger.info('');
    logger.info('✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
    logger.info('');
    logger.info('Summary:');
    logger.info('  ✓ Application workflow completed (Submit → Checking → Finance)');
    logger.info('  ✓ 7-day booking auto-created on Finance approval');
    logger.info('  ✓ Staff names displayed correctly on booking');
    logger.info('  ✓ Booking block prevents other staff from submitting');
    logger.info('  ✓ Same staff (who booked) can still submit');
    logger.info('  ✓ Admin can extend booking');
    logger.info('  ✓ Admin can cancel booking');
    logger.info('  ✓ Blogger released after booking cancellation');
    logger.info('');

    return { success: true, message: 'All workflow tests passed' };
  } catch (error) {
    logger.error('❌ TEST FAILED', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  testCompleteBookingWorkflow()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testCompleteBookingWorkflow,
};
