import MembersListAdvanced from '@/components/MembersListAdvanced';

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لیست اعضا</h1>
          <p className="text-gray-600">مشاهده و مدیریت اعضای سیستم</p>
        </div>
        <MembersListAdvanced />
      </div>
    </div>
  );
}

