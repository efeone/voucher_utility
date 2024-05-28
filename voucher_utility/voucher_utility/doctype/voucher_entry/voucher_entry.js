// Copyright (c) 2024, efeone and contributors
// For license information, please see license.txt

frappe.ui.form.on('Voucher Entry', {
    mode_of_payment: function(frm) {
        var mode_of_payment = frm.doc.mode_of_payment;
        frappe.call({
            method: 'frappe.client.get',
            args: {
                'doctype': 'Mode of Payment',
                'filters': {'name': mode_of_payment},
                'fieldname': ['accounts']
            },
            callback: function(response) {
                if (response && response.message && response.message.accounts && response.message.accounts.length > 0) {
                    var defaultAccount = response.message.accounts[0].default_account;
                    frm.set_value('account', defaultAccount);
                }
            }
        });
    },
    setup: function(frm) {
        frm.set_query('account', 'voucher_account', () => {
            return {
                filters: {
                    is_group: 0
                }
            }
        });
    },
    setup: function(frm) {
        frm.set_query('party_type', 'voucher_account', function(doc, cdt, cdn) {
            const row = locals[cdt][cdn];

            return {
                query: 'erpnext.setup.doctype.party_type.party_type.get_party_type',
                filters: {
                    account: row.account
                }
            };
        });
    },

});

frappe.ui.form.on('Voucher Account', {
    voucher_account_add: function(frm, cdt, cdn) {
        calculate_total_amount(frm);
    },
    voucher_account_remove: function(frm, cdt, cdn) {
        calculate_total_amount(frm);
    },
    amount: function(frm, cdt, cdn) {
        calculate_total_amount(frm);
    }
});

function calculate_total_amount(frm) {
    let total = 0;
    frm.doc.voucher_account.forEach(function(row) {
        if (row.amount) {
            total += row.amount;
        }
    });
    frm.set_value('total_amount', total);
}