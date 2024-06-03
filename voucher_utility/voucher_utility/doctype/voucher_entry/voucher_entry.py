from frappe.model.document import Document
import frappe

class VoucherEntry(Document):
    def on_submit(self):
        self.create_journal_entry()

    def create_journal_entry(self):
        mode_of_payment = self.mode_of_payment
        if mode_of_payment:
            mode_of_payment_doc = frappe.get_doc('Mode of Payment', self.mode_of_payment)
            for df_account in mode_of_payment_doc.accounts:
                default_account = df_account.default_account
        if not default_account:
            frappe.throw(f"Default account not defined for mode of payment: {mode_of_payment}")

        journal_entry = frappe.new_doc("Journal Entry")
        journal_entry.posting_date = self.posting_date
        journal_entry.user_remark = self.user_remarks
        journal_entry.cheque_date = self.reference_date
        journal_entry.cheque_no = self.bank_reference
        journal_entry.voucher_type = "Journal Entry"

        if self.payment_type == 'Pay':
            journal_entry.append('accounts', {
                'account': default_account,
                'credit_in_account_currency': self.total_amount
            })
            for voucher_account in self.voucher_accounts:
                journal_entry.append('accounts', {
                    'account': voucher_account.account,
                    'party_type': voucher_account.party_type,
                    'party': voucher_account.party,
                    'debit_in_account_currency': voucher_account.amount
                })

        elif self.payment_type == 'Receive':
            journal_entry.append('accounts', {
                'account': default_account,
                'debit_in_account_currency': self.total_amount
            })
            for voucher_account in self.voucher_accounts:
                journal_entry.append('accounts', {
                    'account': voucher_account.account,
                    'party_type': voucher_account.party_type,
                    'party': voucher_account.party,
<<<<<<< Updated upstream
                    'credit_in_account_currency': voucher_account.amount
                })
        journal_entry.save()
        frappe.msgprint(f"Journal Entry {journal_entry.name} created successfully.", alert=True, indicator="green")
=======
                    'reference_type': voucher_account.reference_doctype,
                    'reference_name': voucher_account.reference_name,
                    'credit_in_account_currency': voucher_account.amount
                })
        journal_entry.submit()
        frappe.msgprint(f"Journal Entry {journal_entry.name} created successfully.", alert=True, indicator="green")

@frappe.whitelist()
def view_journal_entry(posting_date):
    if frappe.db.exists('Journal Entry',{'posting_date':posting_date}):
        doc_list = frappe.db.get_value('Journal Entry',{'posting_date':posting_date})
        return doc_list
>>>>>>> Stashed changes
