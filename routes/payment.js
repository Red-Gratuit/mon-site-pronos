const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware pour vérifier le token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Route pour créer une session de paiement Stripe
router.post('/create-checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${process.env.BASE_URL}/payment/success`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`,
      customer_email: req.user ? req.user.email : undefined,
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
    console.log('🔍 Portail client - User email:', req.user.email);
    
    const user = await User.findOne({ email: req.user.email });
    console.log('🔍 Portail client - User found:', user ? 'YES' : 'NO');
    console.log('🔍 Portail client - StripeCustomerId:', user?.stripeCustomerId || 'NONE');
    
    if (!user) {
      console.log('❌ Portail client - Utilisateur non trouvé');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Si l'utilisateur n'a pas de stripeCustomerId, on le redirige vers la page de paiement
    if (!user.stripeCustomerId) {
      console.log('ℹ️ Portail client - Pas de stripeCustomerId, redirection vers page d\'accueil');
      return res.json({ 
        url: process.env.BASE_URL,
        message: 'Aucun abonnement actif. Vous pouvez vous abonner depuis la page d\'accueil.'
      });
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
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Erreur signature webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les événements
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Session complétée:', session.id);
      
      // Mettre à jour le statut VIP de l'utilisateur
      if (session.customer_email) {
        try {
          const user = await User.findOneAndUpdate(
            { email: session.customer_email },
            { 
              isVIP: true,
              stripeCustomerId: session.customer,
              stripeSubId: session.subscription
            },
            { new: true }
          );
          
          if (user) {
            console.log(`✅ Utilisateur ${user.email} est maintenant VIP !`);
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
