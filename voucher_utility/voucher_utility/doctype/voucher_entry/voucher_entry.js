// Copyright (c) 2024, efeone and contributors
// For license information, please see license.txt

frappe.ui.form.on('Voucher Entry', {
	mode_of_payment: function(frm) {
		set_account_from_mode_of_payment(frm);
	},
	setup: function(frm) {
		setup_voucher_entry_queries(frm);
	},
	refresh: function(frm) {
		manage_form_buttons(frm);
	},
	account: function(frm){
		update_account_balance(frm);
	},
	on_submit: function(frm) {
		validate_balance(frm);
	}
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
	},
	voucher_entry_type: function(frm, cdt, cdn) {
		validate_and_set_voucher_type(frm, cdt, cdn);
	}
});

/**
 * Calculates the total amount from all rows in the Voucher Accounts table
 * and updates the `total_amount` field on the parent document.
 *
 * Called when any row amount is changed.
 */
function calculate_total_amount(frm) {
	let total = 0;
	frm.doc.voucher_accounts.forEach(function(row) {
		if (row.amount) {
			total += row.amount;
		}
	});
	frm.set_value('total_amount', total);
}

/**
 * Set the 'account' field based on the selected mode of payment.
 * Validates if the mode of payment has a valid company association,
 * hides/shows the account field, and sets the default account if available.
 **/
function set_account_from_mode_of_payment(frm) {
	if (frm.doc.mode_of_payment) {
			frm.set_df_property('account', 'hidden', true);
			frm.refresh_field('account');

			frappe.call({
				method: "voucher_utility.voucher_utility.doctype.voucher_entry.voucher_entry.validate_mode_of_payment_with_bank_account",
				args: {
					voucher_entry: frm.doc.name,
					mode_of_payment: frm.doc.mode_of_payment,
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.exc) {
						frappe.msgprint(r.exc);
						return;
					}

					const { valid_accounts, has_company } = r.message || {};

					// Show account field if company is associated
					if (has_company) {
						frm.set_df_property('account', 'hidden', false);
						frm.refresh_field('account');

						// Set the first valid account or clear the field
						frm.set_value('account', valid_accounts.length ? valid_accounts[0] : '');
					}
				}
			});
	}
}

/**
 * Setup query filters for child table fields in the form.
 * - Filters 'account' in 'voucher_accounts' to exclude groups
 * - Filters 'party_type' based on selected account
 * */
function setup_voucher_entry_queries(frm) {
	// Set account filter for child table 'voucher_accounts'
	frm.set_query('account', 'voucher_accounts', function(doc, cdt, cdn) {
			return {
				filters: {
					is_group: 0
				}
			}
		});
		frm.set_query('party_type', 'voucher_accounts', function(doc, cdt, cdn) {
			const row = locals[cdt][cdn];
			return {
				query: 'erpnext.setup.doctype.party_type.party_type.get_party_type',
				filters: {
					account: row.account
				}
			};
		});
}

/**
 * Add custom buttons to the form, e.g., a 'View' button for submitted documents.
 * This button allows users to open the related Journal Entry for this voucher.
 **/
function manage_form_buttons(frm) {
	// Only show for submitted documents
	if (frm.doc.docstatus === 1) {
		frm.add_custom_button(__('View'), function(){
			frappe.call({
				method: "voucher_utility.voucher_utility.doctype.voucher_entry.voucher_entry.view_journal_entry",
				args: {
					'voucher_entry':frm.doc.name
				},
				callback: function(r) {
					if (r.message){
						frappe.set_route('Form','Journal Entry', r.message);
					}
				}
			});
		});
	}
}

/**
 * Fetch and update the balance for the selected account in the form.
 **/
function update_account_balance(frm) {
	if (frm.doc.account) {
		 frappe.call({
			 method: 'erpnext.accounts.utils.get_balance_on',
			 args: {
				 account: frm.doc.account,
			 },
			 callback: function(r) {
				 if (r.message) {
					 frm.set_value('balance', r.message); // Set the balance field in the form
				 }
			 }
		 });
	}
}

/**
 * Validate that the current account balance is not less than the total amount.
 * Throws an error and prevents submission if balance is insufficient.
 **/
function validate_balance(frm) {
	if (frm.doc.balance < frm.doc.total_amount) {
		   frappe.throw({
			   title: __('Warning'),
			   indicator: 'orange',
			   message: __('Balance cannot be less than Total Amount.')
		   });
		   // Prevent saving the document
		   frappe.validated = false;
	}
}

/**
 * Validate the selected Voucher Entry Type and set the appropriate default account.
 *
 * This function performs:
 * 1. Basic validation: ensures Company is selected before choosing Voucher Entry Type.
 * 2. Server-side validation: checks if the selected Voucher Entry Type belongs to the selected Company.
 * 3. Fetching logic: retrieves and sets the default Account for the selected Voucher Entry Type.
 *
 * Trigger:
 * Called on change of `voucher_entry_type` field inside child table.
 */
function validate_and_set_voucher_type(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
		if (row.voucher_entry_type) {
		  if (!frm.doc.company) {
			  frappe.model.set_value(cdt, cdn, 'voucher_entry_type', );
			  frappe.msgprint(__('Please set the company'));
			  return;
		  }
		  // Validate if the company is associated with the selected voucher entry type
			frappe.call({
				method: 'voucher_utility.voucher_utility.doctype.voucher_entry.voucher_entry.validate_company_for_voucher_entry_type',
				args: {
					voucher_entry_type: row.voucher_entry_type,
					company: frm.doc.company
				},
				callback: function(response) {
					if (!response.message) {
					}
				},
				error: function(err) {
				}
			});
			// Fetch and set the default account after validation
			frappe.call({
				method: 'voucher_utility.voucher_utility.doctype.voucher_entry.voucher_entry.get_default_account',
				args: {
					voucher_entry_type: row.voucher_entry_type,
					company: frm.doc.company
				},
				callback: function(response) {
					if (response.message) {
						let default_account = response.message;
						frappe.model.set_value(cdt, cdn, 'account', default_account);
					}
				}
			});
		}
}