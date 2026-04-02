const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Alternative : SendGrid pour les notifications (pas besoin de mot de passe app)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Fonction pour envoyer une notification admin avec SendGrid
async function sendAdminNotification(subject, message) {
  try {
    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: 'notifications@ev-prono.com',
      subject: subject,
      html: message
    };
    
    await sgMail.send(msg);
    console.log('✅ Notification admin envoyée par SendGrid');
  } catch (error) {
    console.error('❌ Erreur notification admin:', error);
    // Fallback : essayer avec nodemailer si SendGrid ne marche pas
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.ADMIN_EMAIL,
          pass: process.env.ADMIN_EMAIL_PASSWORD
        }
      });
      
      await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: subject,
        html: message
      });
      console.log('✅ Notification admin envoyée par Gmail (fallback)');
    } catch (fallbackError) {
      console.error('❌ Erreur fallback Gmail:', fallbackError);
    }
  }
}

// Middleware pour vérifier le token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Auth - Token reçu:', token ? 'YES' : 'NO');
  console.log('🔍 Auth - Header:', authHeader);

  if (!token) {
    console.log('❌ Auth - Token requis');
    return res.status(401).json({ error: 'Token requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Auth - Token invalide:', err.message);
      return res.status(403).json({ error: 'Token invalide' });
    }
    console.log('✅ Auth - User validé:', user.email);
    req.user = user;
    next();
  });
};

// Route pour créer une session de paiement Stripe (avec 2 plans)
router.post('/create-checkout', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body; // 'basic' ou 'premium'
    
    // Sélectionner le bon Price ID selon le plan
    let priceId;
    if (plan === 'premium') {
      priceId = process.env.STRIPE_PRICE_PREMIUM;
    } else {
      priceId = process.env.STRIPE_PRICE_BASIC; // default
    }
    
    if (!priceId) {
      return res.status(400).json({ error: 'Plan non disponible' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.BASE_URL}/payment/success`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`,
      customer_email: req.user ? req.user.email : undefined,
      metadata: {
        plan: plan || 'basic',
        userId: req.user ? req.user.id : undefined
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
});

// Endpoint de test pour webhook
router.get('/webhook/test', (req, res) => {
  res.json({ message: 'Webhook endpoint is working!' });
});

// Route pour accéder au portail client Stripe
router.post('/customer-portal', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Portail client - User ID:', req.user.id);
    console.log('🔍 Portail client - User email:', req.user.email);
    
    // Chercher par ID au lieu d'email (plus fiable)
    let user = await User.findById(req.user.id);
    console.log('🔍 Portail client - User found:', user ? 'YES' : 'NO');
    console.log('🔍 Portail client - User email from DB:', user?.email);
    console.log('🔍 Portail client - StripeCustomerId:', user?.stripeCustomerId || 'NONE');
    
    if (!user) {
      console.log('❌ Portail client - Utilisateur non trouvé');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur n'a pas de stripeCustomerId, on le crée
    if (!user.stripeCustomerId) {
      console.log('ℹ️ Portail client - Création stripeCustomerId pour:', user.email);
      
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user._id.toString()
          }
        });
        
        // Mettre à jour l'utilisateur avec le nouveau stripeCustomerId
        user = await User.findByIdAndUpdate(
          user._id,
          { stripeCustomerId: customer.id },
          { new: true }
        );
        
        console.log('✅ Portail client - StripeCustomerId créé:', customer.id);
      } catch (stripeError) {
        console.error('❌ Erreur création client Stripe:', stripeError);
        return res.status(500).json({ error: 'Erreur lors de la création du client Stripe' });
      }
    }

    console.log('✅ Portail client - Création session portail pour customer:', user.stripeCustomerId);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.BASE_URL,
    });

    console.log('✅ Portail client - Session créée:', session.url);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Erreur portail client:', error);
    res.status(500).json({ error: 'Erreur lors de la création du portail client' });
  }
});

// Webhook Stripe pour traiter les événements
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  console.log('🔍 Webhook reçu - Signature:', sig ? 'YES' : 'NO');
  console.log('🔍 Webhook reçu - Body type:', typeof req.body);
  console.log('🔍 Webhook reçu - Body length:', req.body ? req.body.length : 'NULL');

  let event;

  try {
    // Utiliser req.body directement (raw buffer)
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook signature vérifiée avec succès');
  } catch (err) {
    console.log(`❌ Erreur signature webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les événements
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Session complétée:', session.id);
      
      // Récupérer le plan depuis les metadata
      const plan = session.metadata?.plan || 'basic';
      
      // Mettre à jour le statut VIP de l'utilisateur
      if (session.customer_email) {
        try {
          const user = await User.findOneAndUpdate(
            { email: session.customer_email },
            { 
              isVIP: true,
              vipTier: plan, // 'basic' ou 'premium'
              stripeCustomerId: session.customer,
              stripeSubId: session.subscription
            },
            { new: true }
          );
          
          if (user) {
            console.log(`✅ Utilisateur ${user.email} est maintenant VIP ${plan.toUpperCase()} !`);
            
            const montant = plan === 'premium' ? '30.00€' : '10.00€';
            
            // 🎉 ENVOYER NOTIFICATION ADMIN SUR IPHONE
            await sendAdminNotification(
              `🎉 NOUVEAU CLIENT VIP ${plan.toUpperCase()} !`,
              `
                <h2>💰 Paiement reçu !</h2>
                <p><strong>Nouveau client VIP ${plan.toUpperCase()} :</strong> ${user.email}</p>
                <p><strong>Montant :</strong> ${montant}/mois</p>
                <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                <p><strong>Session ID :</strong> ${session.id}</p>
                <br>
                <a href="https://dashboard.stripe.com/payments" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir sur Stripe</a>
              `
            );
          } else {
            console.log(`⚠️ Utilisateur ${session.customer_email} non trouvé`);
          }
        } catch (error) {
          console.error('Erreur mise à jour VIP:', error);
        }
      }
      break;
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Abonnement annulé:', subscription.id);
      
      // Retirer le statut VIP
      try {
        const user = await User.findOneAndUpdate(
          { stripeSubId: subscription.id },
          { 
            isVIP: false,
            stripeCustomerId: null,
            stripeSubId: null
          },
          { new: true }
        );
        
        if (user) {
          console.log(`❌ Utilisateur ${user.email} n'est plus VIP`);
        }
      } catch (error) {
        console.error('Erreur retrait VIP:', error);
      }
      break;
      
    default:
      console.log(`Événement non géré: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
