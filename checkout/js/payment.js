document.addEventListener('DOMContentLoaded', function() {
    // Get transaction data from localStorage
    const transactionData = JSON.parse(localStorage.getItem('transactionData'));
    if (!transactionData) {
        alert('Dados da transação não encontrados. Redirecionando para o checkout...');
        window.location.href = 'index.html';
        return;
    }

    console.log('Dados da transação BlackCat carregados:', transactionData);

    // Update customer information
    const customerInfo = document.getElementById('customerInfo');
    if (transactionData.customer) {
        customerInfo.innerHTML = `
            <p><strong>Nome:</strong> ${transactionData.customer.name}</p>
            <p><strong>CPF:</strong> ${transactionData.customer.cpf}</p>
            <p><strong>E-mail:</strong> ${transactionData.customer.email}</p>
            <p><strong>Telefone:</strong> ${transactionData.customer.phone}</p>
        `;
    }

    // Update PIX code - USAR CÓDIGO REAL DA BLACKCAT
    const pixCodeInput = document.getElementById('pixCode');
    let pixCode = null;
    
    // Buscar código PIX REAL da resposta BlackCat
    if (transactionData.pix && transactionData.pix.qrcode) {
        pixCode = transactionData.pix.qrcode;
        console.log('✅ Código PIX REAL da BlackCat encontrado:', pixCode);
    } else if (transactionData.qrcode) {
        pixCode = transactionData.qrcode;
        console.log('✅ Código PIX REAL encontrado em qrcode:', pixCode);
    } else if (transactionData.pix_code) {
        pixCode = transactionData.pix_code;
        console.log('✅ Código PIX REAL encontrado em pix_code:', pixCode);
    } else if (transactionData.pixCopiaECola) {
        pixCode = transactionData.pixCopiaECola;
        console.log('✅ Código PIX REAL encontrado em pixCopiaECola:', pixCode);
    }

    if (pixCode) {
        pixCodeInput.value = pixCode;
        console.log('✅ Código PIX REAL da BlackCat carregado com sucesso!');
    } else {
        console.error('❌ Código PIX não encontrado na resposta BlackCat!');
        pixCodeInput.value = 'Erro: Código PIX não encontrado';
    }

    // Handle copy button
    const copyButton = document.getElementById('copyButton');
    copyButton.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(pixCodeInput.value);
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copiado!';
            copyButton.classList.add('bg-green-600');
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.classList.remove('bg-green-600');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
            pixCodeInput.select();
            document.execCommand('copy');
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copiado!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        }
    });

    // Display QR Code REAL - CORRIGIDO
    const qrcodeContainer = document.getElementById('qrcode');
    
    // Função para gerar QR Code REAL que funciona
    function generateRealQRCode(pixCodeData) {
        console.log('🔄 Iniciando geração de QR Code para:', pixCodeData);
        
        if (!qrcodeContainer) {
            console.error('❌ Container QR Code não encontrado!');
            return;
        }
        
        qrcodeContainer.innerHTML = '';
        
        if (!pixCodeData || pixCodeData === 'Erro: Código PIX não encontrado') {
            qrcodeContainer.innerHTML = `
                <div class="text-center text-red-600 p-4">
                    <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                    <p>Erro ao gerar QR Code</p>
                    <p class="text-sm">Código PIX não encontrado</p>
                </div>
            `;
            return;
        }

        console.log('🔄 Gerando QR Code via API externa...');
        createQRCodeWithAPI(pixCodeData);
    }

    // Função para criar QR Code via API externa
    function createQRCodeWithAPI(data) {
        const qrContainer = document.createElement('div');
        qrContainer.className = 'flex flex-col items-center space-y-4';
        
        const img = document.createElement('img');
        img.className = 'border border-gray-200 rounded-lg bg-white shadow-lg';
        img.style.width = '256px';
        img.style.height = '256px';
        img.alt = 'QR Code PIX REAL';
        
        const encodedData = encodeURIComponent(data);
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&format=png&data=${encodedData}`;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'flex items-center justify-center w-64 h-64 border border-gray-200 rounded-lg bg-gray-50';
        loadingDiv.innerHTML = `
            <div class="text-center">
                <div class="loading-spinner mx-auto mb-2"></div>
                <p class="text-sm text-gray-600">Gerando QR Code...</p>
            </div>
        `;
        
        qrContainer.appendChild(loadingDiv);
        qrcodeContainer.appendChild(qrContainer);
        
        img.onload = function() {
            console.log('✅ QR Code REAL gerado com sucesso via API!');
            loadingDiv.remove();
            qrContainer.appendChild(img);
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'text-center text-sm text-gray-600 mt-2';
            infoDiv.innerHTML = `
                <p class="font-medium text-green-600 mb-1">✅ QR Code gerado!</p>
                <p>Escaneie com seu app bancário para pagar R$ 78,47</p>
            `;
            qrContainer.appendChild(infoDiv);
        };
        
        img.onerror = function() {
            console.error('❌ Erro ao gerar QR Code via API externa, tentando método alternativo...');
            loadingDiv.remove();
            tryAlternativeQRAPI(data, qrContainer);
        };
    }

    // Sistema de detecção de pagamento PIX
    let checkCount = 0;
    const MAX_CHECKS = 180; // 30 minutos (180 * 10 segundos)

    // Verificar status do pagamento
    async function checkPaymentStatus() {
        let transactionId = transactionData.id || transactionData.transaction_id;

        if (!transactionId) {
            console.warn('ID da transação BlackCat não encontrado');
            return;
        }

        checkCount++;
        console.log(`🔄 Verificando pagamento ${checkCount}/${MAX_CHECKS} - ID: ${transactionId}`);

        try {
            const publicKey = 'pk_pXb05DCxytcnz8SViYmOjSo2BlHKf0vUlpegTgmgkfwdNF-7';
            const secretKey = 'sk_Br-pkbauum5bAzSRqqHa1kfcirDqVLrVMRu5Dr-gZdn2B4WP';

            const response = await fetch(`https://api.blackcatpagamentos.com/v1/transactions/${transactionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa(publicKey + ':' + secretKey),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const statusData = await response.json();
                console.log('📊 Status atual:', statusData.status);

                if (statusData.status === 'paid' || statusData.status === 'approved') {
                    console.log('🎉 PAGAMENTO CONFIRMADO!');
                    
                    // Parar verificações
                    if (statusInterval) {
                        clearInterval(statusInterval);
                    }

                    // Salvar dados para página de obrigado
                    localStorage.setItem('transactionId', transactionId);
                    localStorage.setItem('paymentConfirmed', 'true');

                    // Disparar pixels de conversão
                    await triggerConversionPixels(transactionData);

                    // Mostrar mensagem de sucesso
                    showPaymentSuccess();

                    // Redirecionar após 3 segundos
                    setTimeout(() => {
                        window.location.href = 'obrigado.html';
                    }, 3000);

                    return;
                }

                // Atualizar status na tela
                updatePaymentStatus(statusData.status);

            } else {
                console.log('❌ Erro ao verificar status:', response.status);
            }

        } catch (error) {
            console.error('❌ Erro na verificação:', error);
        }

        // Parar verificações após tempo limite
        if (checkCount >= MAX_CHECKS) {
            console.log('⏰ Tempo limite atingido');
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            showPaymentTimeout();
        }
    }

    // Disparar pixels de conversão
    async function triggerConversionPixels(transactionData) {
        console.log('🎯 Disparando pixels de conversão...');

        try {
            // Google Ads
            if (typeof gtag !== 'undefined') {
                gtag('event', 'conversion', {
                    'send_to': 'AW-XXXXXXXXX/YYYYYYYYYY', // SUBSTITUA pelos seus IDs
                    'transaction_id': transactionData.id,
                    'value': 61.90,
                    'currency': 'BRL'
                });
                console.log('✅ Google Ads pixel disparado');
            }

            // Facebook Pixel
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Purchase', {
                    value: 61.90,
                    currency: 'BRL',
                    content_ids: ['tarifa-transacional-2025'],
                    content_type: 'product',
                    transaction_id: transactionData.id
                });
                console.log('✅ Facebook Pixel disparado');
            }

        } catch (error) {
            console.error('❌ Erro ao disparar pixels:', error);
        }
    }

    // Mostrar sucesso do pagamento
    function showPaymentSuccess() {
        const container = document.querySelector('.payment-container') || document.body;
        
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        successDiv.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-check text-2xl text-green-500"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">🎉 Pagamento Confirmado!</h3>
                <p class="text-gray-600 mb-4">Seu PIX foi processado com sucesso!</p>
                <div class="text-sm text-gray-500">Redirecionando em 3 segundos...</div>
            </div>
        `;
        
        container.appendChild(successDiv);
    }

    // Mostrar timeout do pagamento
    function showPaymentTimeout() {
        const statusDiv = document.querySelector('.payment-status');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <strong>⏰ Tempo Limite Atingido</strong>
                    <p class="mt-2">A verificação automática foi interrompida. Se você já fez o pagamento, aguarde alguns minutos e recarregue a página.</p>
                    <button onclick="location.reload()" class="mt-3 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
                        Verificar Novamente
                    </button>
                </div>
            `;
        }
    }

    // Atualizar status na tela
    function updatePaymentStatus(status) {
        const statusMap = {
            'waiting_payment': '⏳ Aguardando pagamento...',
            'processing': '🔄 Processando pagamento...',
            'paid': '✅ Pagamento confirmado!',
            'approved': '✅ Pagamento aprovado!',
            'cancelled': '❌ Pagamento cancelado',
            'expired': '⏰ PIX expirado'
        };

        const statusText = statusMap[status] || `Status: ${status}`;
        
        const statusElement = document.querySelector('.payment-status-text');
        if (statusElement) {
            statusElement.textContent = statusText;
        }
    }

    // Gerar QR Code REAL
    console.log('🔄 Verificando código PIX para QR Code...');
    if (pixCode && pixCode !== 'Erro: Código PIX não encontrado') {
        console.log('✅ Código PIX encontrado, gerando QR Code...');
        generateRealQRCode(pixCode);
    } else {
        console.error('❌ Código PIX não encontrado para QR Code');
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = `
                <div class="text-center text-red-600 p-4">
                    <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                    <p>Código PIX não encontrado</p>
                    <p class="text-sm">Erro na resposta da BlackCat</p>
                </div>
            `;
        }
    }

    // Iniciar verificação de pagamento
    console.log('🚀 Iniciando monitoramento de pagamento...');
    checkPaymentStatus(); // Verificar imediatamente
    const statusInterval = setInterval(checkPaymentStatus, 10000); // Verificar a cada 10 segundos

    // Parar verificação ao sair da página
    window.addEventListener('beforeunload', () => {
        if (statusInterval) {
            clearInterval(statusInterval);
        }
    });

    // Adicionar botão de voltar
    const backButton = document.createElement('button');
    backButton.className = 'mt-4 text-gray-600 hover:text-gray-800 text-sm flex items-center transition-colors duration-200';
    backButton.innerHTML = '<i class="fas fa-arrow-left mr-2"></i>Voltar ao checkout';
    backButton.addEventListener('click', function() {
        localStorage.removeItem('transactionData');
        window.location.href = 'index.html';
    });
    
    document.querySelector('.space-y-8').appendChild(backButton);

    // Exibir ID da transação
    const displayId = transactionData.id || transactionData.transaction_id;
    if (displayId) {
        const transactionIdDiv = document.createElement('div');
        transactionIdDiv.className = 'mt-4 text-xs text-gray-500 text-center';
        transactionIdDiv.innerHTML = `ID da Transação BlackCat: ${displayId}`;
        document.querySelector('.space-y-8').appendChild(transactionIdDiv);
    }

    // Mostrar mensagem de sucesso inicial
    const pixGeneratedDiv = document.createElement('div');
    pixGeneratedDiv.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4';
    pixGeneratedDiv.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas fa-qrcode text-blue-500 text-xl"></i>
            <div>
                <p class="font-medium text-blue-700">PIX BlackCat gerado com sucesso!</p>
                <p class="text-sm text-blue-600">Escaneie o QR Code REAL ou use o código PIX para pagar R$ 78,47</p>
            </div>
        </div>
    `;
    document.querySelector('.space-y-8').insertBefore(pixGeneratedDiv, document.querySelector('.space-y-8').firstChild);
});
