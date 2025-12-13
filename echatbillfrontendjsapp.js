
// ==============================================
//  SUBSCRIPTION STATUS & TRIAL PERIOD DISPLAY
// ==============================================

function updateSubscriptionDisplay() {
    const trialCard = document.getElementById('trial-period-card');
    const subscriptionCard = document.getElementById('current-subscription-card');
    const trialDetails = document.getElementById('trial-details');
    const subscriptionDetails = document.getElementById('subscription-details');
    const subscriptionPlanName = document.getElementById('subscription-plan-name');

    // Get user data from localStorage or API
    const token = localStorage.getItem('token');
    if (!token) {
        // Not logged in - hide both cards
        if (trialCard) trialCard.style.display = 'none';
        if (subscriptionCard) subscriptionCard.style.display = 'none';
        return;
    }

    // For demo purposes - check if user has active subscription
    // In production, this should come from API
    const subscriptionStatus = getSubscriptionStatus();

    if (subscriptionStatus.isTrial) {
        // Show trial card
        if (trialCard) {
            trialCard.style.display = 'block';
            const daysRemaining = subscriptionStatus.daysRemaining;
            const expiryDate = subscriptionStatus.expiryDate;
            
            trialDetails.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <span style="color: white; opacity: 0.9; font-size: 0.875rem;">Perioada de proba expira in:</span>
                    <span style="color: white; font-size: 1.5rem; font-weight: 700;">${daysRemaining} zile</span>
                </div>
                <div style="color: white; opacity: 0.8; font-size: 0.75rem; text-align: center; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.2);">
                    Data expirare: ${expiryDate}
                </div>
            `;
        }
        if (subscriptionCard) subscriptionCard.style.display = 'none';
    } else if (subscriptionStatus.isActive) {
        // Show subscription card
        if (subscriptionCard) {
            subscriptionCard.style.display = 'block';
            const planName = subscriptionStatus.planType === 'annual' ? 'Plan Anual' : 'Plan Lunar';
            const daysRemaining = subscriptionStatus.daysRemaining;
            const expiryDate = subscriptionStatus.expiryDate;
            const renewalDate = subscriptionStatus.renewalDate;
            
            if (subscriptionPlanName) {
                subscriptionPlanName.textContent = planName;
            }

            subscriptionDetails.innerHTML = `
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: white; opacity: 0.9; font-size: 0.875rem;">Tip abonament:</span>
                        <span style="color: white; font-weight: 600;">${planName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: white; opacity: 0.9; font-size: 0.875rem;">Status:</span>
                        <span style="color: white; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;">
                            <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
                            Activ
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.2);">
                        <span style="color: white; opacity: 0.9; font-size: 0.875rem;">Zile ramase:</span>
                        <span style="color: white; font-size: 1.5rem; font-weight: 700;">${daysRemaining} zile</span>
                    </div>
                    <div style="color: white; opacity: 0.8; font-size: 0.75rem; text-align: center;">
                        Urmatoarea facturare: ${renewalDate || expiryDate}
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
        if (trialCard) trialCard.style.display = 'none';
    } else {
        // No subscription - hide both cards
        if (trialCard) trialCard.style.display = 'none';
        if (subscriptionCard) subscriptionCard.style.display = 'none';
    }
}

function getSubscriptionStatus() {
    // This should come from API in production
    // For now, return demo data
    
    // Check localStorage for demo purposes
    const demoStatus = localStorage.getItem('demoSubscriptionStatus');
    if (demoStatus) {
        return JSON.parse(demoStatus);
    }

    // Default: Trial period for new users
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial

    return {
        isTrial: true,
        isActive: false,
        daysRemaining: 14,
        expiryDate: trialEndDate.toLocaleDateString('ro-RO'),
        planType: null,
        renewalDate: null
    };
}

// Update display when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateSubscriptionDisplay();
});

// For demo/testing - you can call this in console:
// setDemoSubscription('trial', 7) - sets 7 days trial
// setDemoSubscription('monthly', 25) - sets monthly with 25 days remaining
// setDemoSubscription('annual', 340) - sets annual with 340 days remaining
window.setDemoSubscription = function(type, daysRemaining) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysRemaining);

    const status = {
        isTrial: type === 'trial',
        isActive: type !== 'trial',
        daysRemaining: daysRemaining,
        expiryDate: expiryDate.toLocaleDateString('ro-RO'),
        planType: type === 'trial' ? null : type,
        renewalDate: type !== 'trial' ? expiryDate.toLocaleDateString('ro-RO') : null
    };

    localStorage.setItem('demoSubscriptionStatus', JSON.stringify(status));
    updateSubscriptionDisplay();
    console.log('Demo subscription status updated:', status);
};

