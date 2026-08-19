const statusTranslations = {
  'Waiting': 'قيد الانتظار',
  'Preparing': 'جاري التجهيز',
  'Preparing in workshop': 'جاري التجهيز في الورشة',
  'Ready': 'جاهز',
  'Ready for delivery': 'جاهز للتوصيل',
  'Ready for pickup': 'جاهز للاستلام',
  'Scheduled': 'جدول',
  'Assigned': 'تم التعيين',
  'In Progress': 'قيد التنفيذ',
  'Picked Up': 'تم الاستلام',
  'Completed': 'مكتمل',
  'Out For Delivery': 'خارج للتوصيل',
  'Out for Delivery': 'خارج للتوصيل',
  'Delivered': 'تم التوصيل',
  'Failed': 'فشل',
  'Paid': 'مدفوع',
  'Pending': 'معلق'
};

export const translateNotification = (title, text, language) => {
  if (language !== 'ar') {
    return { title, text };
  }

  // 1. Title translations
  const titleMap = {
    'New Order Created': 'تم إنشاء طلب جديد',
    'New Delivery Scheduled': 'تم جدولة توصيل جديد',
    'Delivery Assigned': 'تم تعيين التوصيل',
    'Delivery Status Updated': 'تم تحديث حالة التوصيل',
    'Order Status Updated': 'تم تحديث حالة الطلب',
    'Payment Received': 'تم استلام الدفعة',
    'Payment Updated': 'تم تحديث الدفعة',
    'New Pickup Scheduled': 'تم جدولة استلام جديد',
    'Pickup Assigned': 'تم تعيين الاستلام',
    'Pickup Status Updated': 'تم تحديث حالة الاستلام',
    'Balance Settled': 'تم تسوية الرصيد'
  };

  const translatedTitle = titleMap[title] || title;

  // 2. Status translation helper inside texts
  const translateStatusVal = (statusStr) => {
    const trimmed = statusStr ? statusStr.trim() : '';
    return statusTranslations[trimmed] || trimmed;
  };

  let translatedText = text;

  // Pattern matching for notifications body text:
  
  // A. Order status changed
  const orderStatusRegex = /Order\s+(ORD-\d+)\s+status\s+changed\s+to\s+(.+)\./i;
  if (orderStatusRegex.test(text)) {
    const match = text.match(orderStatusRegex);
    const orderNo = match[1];
    const statusVal = translateStatusVal(match[2]);
    translatedText = `تم تغيير حالة الطلب ${orderNo} إلى ${statusVal}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // B. Order created
  const orderCreatedRegex = /Order\s+(ORD-\d+)\s+was\s+created\s+for\s+(.+)\./i;
  if (orderCreatedRegex.test(text)) {
    const match = text.match(orderCreatedRegex);
    const orderNo = match[1];
    const customerName = match[2];
    translatedText = `تم إنشاء الطلب ${orderNo} للعميل ${customerName}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // C. Delivery scheduled
  const deliveryScheduledRegex = /Delivery\s+(DEL-\d+)\s+scheduled\s+for\s+(.+)\./i;
  if (deliveryScheduledRegex.test(text)) {
    const match = text.match(deliveryScheduledRegex);
    const deliveryId = match[1];
    const customerName = match[2];
    translatedText = `تم جدولة التوصيل ${deliveryId} للعميل ${customerName}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // D. Delivery assigned
  const deliveryAssignedRegex = /Delivery\s+(DEL-\d+)\s+has\s+been\s+assigned\s+to\s+driver\s+(.+)\./i;
  if (deliveryAssignedRegex.test(text)) {
    const match = text.match(deliveryAssignedRegex);
    const deliveryId = match[1];
    const driverName = match[2];
    translatedText = `تم تعيين التوصيل ${deliveryId} للسائق ${driverName}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // E. Delivery status changed
  const deliveryStatusRegex = /Delivery\s+(DEL-\d+)\s+status\s+changed\s+to\s+(.+)\./i;
  if (deliveryStatusRegex.test(text)) {
    const match = text.match(deliveryStatusRegex);
    const deliveryId = match[1];
    const statusVal = translateStatusVal(match[2]);
    translatedText = `تم تغيير حالة التوصيل ${deliveryId} إلى ${statusVal}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // F. Pickup scheduled
  const pickupScheduledRegex = /Pickup\s+(PKP-\d+)\s+scheduled\s+for\s+(.+)\./i;
  if (pickupScheduledRegex.test(text)) {
    const match = text.match(pickupScheduledRegex);
    const pickupId = match[1];
    const customerName = match[2];
    translatedText = `تم جدولة الاستلام ${pickupId} للعميل ${customerName}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // G. Pickup assigned
  const pickupAssignedRegex = /Pickup\s+(PKP-\d+)\s+has\s+been\s+assigned\s+to\s+driver\s+(.+)\./i;
  if (pickupAssignedRegex.test(text)) {
    const match = text.match(pickupAssignedRegex);
    const pickupId = match[1];
    const driverName = match[2];
    translatedText = `تم تعيين الاستلام ${pickupId} للسائق ${driverName}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // H. Pickup status changed
  const pickupStatusRegex = /Pickup\s+(PKP-\d+)\s+status\s+changed\s+to\s+(.+)\./i;
  if (pickupStatusRegex.test(text)) {
    const match = text.match(pickupStatusRegex);
    const pickupId = match[1];
    const statusVal = translateStatusVal(match[2]);
    translatedText = `تم تغيير حالة الاستلام ${pickupId} إلى ${statusVal}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // I. Payment received
  const paymentReceivedRegex = /Payment\s+of\s+(.+)\s+received\s+for\s+order\s+(ORD-\d+)\./i;
  if (paymentReceivedRegex.test(text)) {
    const match = text.match(paymentReceivedRegex);
    const amount = match[1];
    const orderNo = match[2];
    translatedText = `تم استلام دفعة بقيمة ${amount} للطلب ${orderNo}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // J. Payment updated
  const paymentUpdatedRegex = /Payment\s+of\s+(.+)\s+for\s+order\s+(ORD-\d+)\s+updated\s+to\s+(.+)\./i;
  if (paymentUpdatedRegex.test(text)) {
    const match = text.match(paymentUpdatedRegex);
    const amount = match[1];
    const orderNo = match[2];
    const statusVal = translateStatusVal(match[3]);
    translatedText = `تم تحديث دفعة بقيمة ${amount} للطلب ${orderNo} إلى ${statusVal}.`;
    return { title: translatedTitle, text: translatedText };
  }

  // K. Balance settled
  const balanceSettledRegex = /Customer\s+(.+)\s+settled\s+outstanding\s+balance\s+of\s+(.+)\./i;
  if (balanceSettledRegex.test(text)) {
    const match = text.match(balanceSettledRegex);
    const customerName = match[1];
    const amount = match[2];
    translatedText = `قام العميل ${customerName} بتسوية رصيده المستحق بقيمة ${amount}.`;
    return { title: translatedTitle, text: translatedText };
  }

  return { title: translatedTitle, text: translatedText };
};
