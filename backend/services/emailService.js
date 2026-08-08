const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || 'mock_user',
    pass: process.env.SMTP_PASS || 'mock_pass'
  }
});

async function sendPortfolioCreationEmail(userEmail, userName, portfolio) {
  try {
    const expRet = (portfolio.metrics.expectedReturn * 100).toFixed(2);
    const sharpe = portfolio.metrics.sharpeRatio.toFixed(2);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">AI Investment Advisor</h2>
        <p>Hello ${userName},</p>
        <p>Your optimized portfolio <strong>"${portfolio.name}"</strong> has been successfully generated!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #2563eb;">Key Highlights</h3>
          <ul>
            <li><strong>Expected Annual Return:</strong> ${expRet}%</li>
            <li><strong>Sharpe Ratio:</strong> ${sharpe}</li>
            <li><strong>Total Investment:</strong> $${portfolio.investmentAmount.toLocaleString()}</li>
            <li><strong>Holdings Count:</strong> ${portfolio.assets.length} assets</li>
          </ul>
        </div>
        
        <p>Log in to your interactive dashboard to view your Markowitz Efficient Frontier scatter plot, news sentiment signals, and PDF export reports.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">AI Investment Advisor - Automated Financial Advisory Notification</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"AI Investment Advisor" <${process.env.FROM_EMAIL || 'noreply@aiadvisor.com'}>`,
      to: userEmail,
      subject: `Your AI Portfolio Recommendation is Ready: ${portfolio.name}`,
      html: htmlContent
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.warn('Nodemailer notice (SMTP mock mode):', error.message);
    return false;
  }
}

module.exports = { sendPortfolioCreationEmail };
