from frappe.model.document import Document
import frappe

class VoucherEntry(Document):
    def before_save(self):
        self.create_journal_entry()

    def create_journal_entry(self):
        journal_entry = frappe.new_doc("Journal Entry")
        journal_entry.posting_date = self.posting_date
        journal_entry.user_remark = self.user_remarks
        journal_entry.cheque_date = self.reference_date
        journal_entry.cheque_no = self.bank_reference
        journal_entry.voucher_type = "Journal Entry"
        total_amount = self.total_amount

        for voucher_account in self.voucher_account:
            if self.payment_type == 'Pay':
                journal_entry.append("accounts", {
                    "account": voucher_account.account,
                    "party_type": voucher_account.party_type,
                    "party": voucher_account.party,
                    "debit_in_account_currency": voucher_account.amount,
                    "credit_in_account_currency": 0,
                })
            elif self.payment_type == 'Receive':
                journal_entry.append("accounts", {
                    "account": voucher_account.account,
                    "party_type": voucher_account.party_type,
                    "party": voucher_account.party,
                    "debit_in_account_currency": 0,
                    "credit_in_account_currency": voucher_account.amount,
                })

        if self.payment_type == 'Pay':
            journal_entry.total_debit = total_amount
            journal_entry.total_credit = total_amount
        elif self.payment_type == 'Receive':
            journal_entry.total_credit = total_amount
            journal_entry.total_debit = total_amount


        journal_entry.insert()
        journal_entry.save()

        frappe.msgprint(f"Journal Entry {journal_entry.name} created successfully.")
