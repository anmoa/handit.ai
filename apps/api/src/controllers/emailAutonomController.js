import { sendAutonomWaitlistEmail, sendWelcomeNewUserEmail, sendWelcomeHanditEmail } from "../services/emailService.js";
import db from '../../models/index.js';

const { Email, User } = db;

export const sendAutonomEmail = async (req, res) => {
  try {
    const { to, firstName } = req.body;

    if (!to || !firstName) {
      return res.status(400).json({ error: 'Email and first name are required' });
    }

    await sendAutonomWaitlistEmail({
      recipientEmail: to,
      firstName,
      Email,
      User
    });
    
    res.status(201).json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending Autonom waitlist email:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
};

export const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, firstName, password } = req.body;

    if (!email || !firstName || !password) {
      return res.status(400).json({ error: 'Email, first name, and password are required' });
    }

    await sendWelcomeNewUserEmail({
      recipientEmail: email,
      firstName,
      password,
      Email,
      User
    });
    
    res.status(201).json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
};

export const sendHanditWelcomeEmail = async (req, res) => {
  try {
    const { email, firstName } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Email and first name are required' });
    }

    await sendWelcomeHanditEmail({
      recipientEmail: email,
      firstName,
      Email,
      User
    });
    
    res.status(201).json({ message: 'HandIt welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending HandIt welcome email:', error);
    res.status(500).json({ error: 'Failed to send HandIt welcome email' });
  }
};
