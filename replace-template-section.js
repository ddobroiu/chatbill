const fs = require('fs');

let content = fs.readFileSync('e:/chatbill/frontend/index.html', 'utf8');

// Find and replace the template settings section
const startMarker = '        <!-- Template Settings Page -->';
const endMarker = '        <!-- Subscription Page -->';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log('Markers not found');
    process.exit(1);
}

const newSection = `        <!-- Template Settings Page -->
        <div id="template-settings" class="page">
            <div class="page-header" style="margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem;">Sabloane Documente</h2>
                <p style="font-size: 0.875rem;">Alege stilul vizual pentru fiecare tip de document</p>
            </div>

            <!-- Modern Tabs -->
            <div class="template-tabs-container">
                <!-- Tab Navigation -->
                <div class="template-tabs" style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem;">
                    <button class="template-tab active" data-tab="invoice" style="flex: 1; padding: 0.75rem 1rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; color: var(--secondary-foreground);">
                        <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
                        <span>Factura</span>
                    </button>
                    <button class="template-tab" data-tab="proforma" style="flex: 1; padding: 0.75rem 1rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; color: var(--secondary-foreground);">
                        <i data-lucide="file-check" style="width: 18px; height: 18px;"></i>
                        <span>Proforma</span>
                    </button>
                    <button class="template-tab" data-tab="quote" style="flex: 1; padding: 0.75rem 1rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; color: var(--secondary-foreground);">
                        <i data-lucide="file-edit" style="width: 18px; height: 18px;"></i>
                        <span>Oferta</span>
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="template-tabs-content">
                    <!-- Invoice Tab -->
                    <div class="template-tab-panel active" data-panel="invoice">
                        <div class="card" style="padding: 1.5rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="file-text" style="width: 24px; height: 24px; color: white;"></i>
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--foreground);">Template Factura</h3>
                                    <p style="margin: 0; font-size: 0.875rem; color: var(--secondary-foreground);">Alege stilul pentru facturile fiscale emise</p>
                                </div>
                            </div>
                            <div id="template-selector-invoice" class="template-selector" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                <div class="template-card selected" data-template="modern" style="border: 3px solid #3b82f6; border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/6ZIZg8t.png" alt="Modern Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Modern</span>
                                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #3b82f6;"></i>
                                    </div>
                                </div>
                                <div class="template-card" data-template="classic" style="border: 2px solid var(--border); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/L3gV1S2.png" alt="Classic Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Clasic</span>
                                        <i data-lucide="circle" style="width: 20px; height: 20px; color: var(--border);"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Proforma Tab -->
                    <div class="template-tab-panel" data-panel="proforma" style="display: none;">
                        <div class="card" style="padding: 1.5rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="file-check" style="width: 24px; height: 24px; color: white;"></i>
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--foreground);">Template Proforma</h3>
                                    <p style="margin: 0; font-size: 0.875rem; color: var(--secondary-foreground);">Alege stilul pentru facturile proforma</p>
                                </div>
                            </div>
                            <div id="template-selector-proforma" class="template-selector" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                <div class="template-card selected" data-template="modern" style="border: 3px solid #10b981; border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/6ZIZg8t.png" alt="Modern Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Modern</span>
                                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                                    </div>
                                </div>
                                <div class="template-card" data-template="classic" style="border: 2px solid var(--border); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/L3gV1S2.png" alt="Classic Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Clasic</span>
                                        <i data-lucide="circle" style="width: 20px; height: 20px; color: var(--border);"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quote Tab -->
                    <div class="template-tab-panel" data-panel="quote" style="display: none;">
                        <div class="card" style="padding: 1.5rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="file-edit" style="width: 24px; height: 24px; color: white;"></i>
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.25rem; color: var(--foreground);">Template Oferta</h3>
                                    <p style="margin: 0; font-size: 0.875rem; color: var(--secondary-foreground);">Alege stilul pentru ofertele comerciale</p>
                                </div>
                            </div>
                            <div id="template-selector-quote" class="template-selector" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                <div class="template-card selected" data-template="modern" style="border: 3px solid #f59e0b; border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/6ZIZg8t.png" alt="Modern Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Modern</span>
                                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #f59e0b;"></i>
                                    </div>
                                </div>
                                <div class="template-card" data-template="classic" style="border: 2px solid var(--border); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; background: var(--card-background);">
                                    <img src="https://i.imgur.com/L3gV1S2.png" alt="Classic Template" style="width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 600; color: var(--foreground);">Clasic</span>
                                        <i data-lucide="circle" style="width: 20px; height: 20px; color: var(--border);"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        `;

content = content.substring(0, startIndex) + newSection + content.substring(endIndex);

fs.writeFileSync('e:/chatbill/frontend/index.html', content, 'utf8');

console.log('✅ Template settings section replaced successfully');
