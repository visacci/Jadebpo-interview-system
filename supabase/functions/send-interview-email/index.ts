const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, to, applicantName, jobTitle, interviewDate, interviewTime, applicationId } = await req.json();

    if (!to || !applicantName || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const aptitudeTestUrl = applicationId ? `${SUPABASE_URL.replace('.supabase.co', '').includes('localhost') ? 'http://localhost:5173' : SUPABASE_URL.replace('https://', 'https://').replace('.supabase.co', '')}/aptitude/${applicationId}` : '';

    // Use the frontend origin for the aptitude link
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://careers.jadebpo.com';
    const aptitudeLink = applicationId ? `${frontendUrl}/aptitude/${applicationId}` : '';

    let subject: string;
    let html: string;

    if (type === 'invite') {
      subject = `Interview Invitation - ${jobTitle} at Jade BPO`;
      const aptitudeSection = aptitudeLink ? `
        <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #856404; font-weight: bold;">📝 Aptitude Test Required</p>
          <p style="margin: 4px 0; color: #856404;">
            Before your interview, please complete the aptitude test. You will have <strong>20 minutes</strong> to complete it.
          </p>
          <p style="margin: 8px 0; color: #dc2626; font-weight: bold; font-size: 14px; background: #fee2e2; padding: 8px; border-radius: 4px; border-left: 4px solid #dc2626;">
            ⚠️ CAUTION: Once you click the "Take Aptitude Test" button below, the 20-minute timer will start immediately and cannot be paused. Please ensure you have a stable internet connection and 20 minutes of uninterrupted time.
          </p>
          <a href="${aptitudeLink}" style="display: inline-block; background: #1a365d; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px; font-weight: bold;">
            Take Aptitude Test
          </a>
        </div>
      ` : '';

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Jade BPO</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Interview Invitation</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1e293b;">Dear <strong>${applicantName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">
              We are pleased to inform you that you have been selected for an interview for the position of 
              <strong>${jobTitle}</strong> at Jade BPO.
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #1e293b; font-weight: bold;">Interview Details:</p>
              <p style="margin: 4px 0; color: #475569;">📅 <strong>Date:</strong> ${interviewDate}</p>
              <p style="margin: 4px 0; color: #475569;">🕐 <strong>Time:</strong> ${interviewTime}</p>
              <p style="margin: 4px 0; color: #475569;">📍 <strong>Location:</strong> Jade BPO Office</p>
            </div>
            ${aptitudeSection}
            <p style="color: #475569; line-height: 1.6;">
              Please bring the following documents:
            </p>
            <ul style="color: #475569; line-height: 1.8;">
              <li>Original National ID</li>
              <li>Academic documents</li>
              <li>Any other relevant certificates</li>
            </ul>
            <p style="color: #475569; line-height: 1.6;">
              If you have any questions or need to reschedule, please contact us at 
              <a href="mailto:hr@jadebpo.com" style="color: #2563eb;">hr@jadebpo.com</a>.
            </p>
            <p style="color: #475569; margin-top: 20px;">
              Best regards,<br/>
              <strong>Human Resources Department</strong><br/>
              Jade BPO
            </p>
          </div>
        </div>
      `;
    } else if (type === 'application_received') {
      subject = `Application Received - ${jobTitle} at Jade BPO`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Jade BPO</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Application Confirmation</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1e293b;">Dear <strong>${applicantName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for applying for the <strong>${jobTitle}</strong> position at Jade BPO.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              We have successfully received your application and our HR team will review it shortly. 
              If your profile matches our requirements, we will contact you via email with next steps.
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #1e293b; font-weight: bold;">What happens next?</p>
              <p style="margin: 4px 0; color: #475569;">1. Our team reviews your application</p>
              <p style="margin: 4px 0; color: #475569;">2. If shortlisted, you'll receive an interview invitation with an aptitude test link</p>
              <p style="margin: 4px 0; color: #475569;">3. Complete the aptitude test before your interview date</p>
            </div>
            <p style="color: #475569; line-height: 1.6;">
              If you have any questions, please contact us at 
              <a href="mailto:hr@jadebpo.com" style="color: #2563eb;">hr@jadebpo.com</a>.
            </p>
            <p style="color: #475569; margin-top: 20px;">
              Best regards,<br/>
              <strong>Human Resources Department</strong><br/>
              Jade BPO
            </p>
          </div>
        </div>
      `;
    } else if (type === 'success') {
      subject = `Interview Outcome - ${jobTitle} at Jade BPO`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #14532d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Jade BPO</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Interview Outcome</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1e293b;">Dear <strong>${applicantName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for interviewing for the <strong>${jobTitle}</strong> position at Jade BPO.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              We are pleased to inform you that you have successfully passed this interview stage.
              Our HR team will contact you shortly with the next steps.
            </p>
            <div style="background: #ecfdf3; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-weight: bold;">
                Congratulations, and thank you for your interest in joining Jade BPO.
              </p>
            </div>
            <p style="color: #475569; margin-top: 20px;">
              Best regards,<br/>
              <strong>Human Resources Department</strong><br/>
              Jade BPO
            </p>
          </div>
        </div>
      `;
    } else if (type === 'rejection') {
      subject = `Application Update - ${jobTitle} at Jade BPO`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Jade BPO</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Application Update</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1e293b;">Dear <strong>${applicantName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for your interest in the <strong>${jobTitle}</strong> position at Jade BPO.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              After careful consideration, we regret to inform you that we will not be moving forward 
              with your application at this time.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              We encourage you to apply for future openings. We wish you all the best in your career journey.
            </p>
            <p style="color: #475569; margin-top: 20px;">
              Best regards,<br/>
              <strong>Human Resources Department</strong><br/>
              Jade BPO
            </p>
          </div>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || 're_Z95cUygm_97anamghrA8hJo7EapTkeYfh';
    
    if (RESEND_KEY) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      let emailResponse;

      if (LOVABLE_API_KEY) {
        console.log('Sending email via Lovable gateway...');
        const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
        emailResponse = await fetch(`${GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': RESEND_KEY,
          },
          body: JSON.stringify({
            from: 'Jade BPO HR <hr@jadebpo.com>',
            to: [to],
            subject,
            html,
          }),
        });
      } else {
        console.log('Sending email via direct Resend API...');
        emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_KEY}`,
          },
          body: JSON.stringify({
            from: 'Jade BPO HR <hr@jadebpo.com>',
            to: [to],
            subject,
            html,
          }),
        });
      }

      const result = await emailResponse.json();
      if (!emailResponse.ok) {
        console.error('Email send failed:', result);
        return new Response(JSON.stringify({ success: false, error: result }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[EMAIL SIMULATED] To: ${to}, Subject: ${subject}`);
    return new Response(JSON.stringify({ success: true, simulated: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
