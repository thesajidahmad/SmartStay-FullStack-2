import React, { useEffect, useState } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const MyBookings = () => {
  const { axios, getToken, user, currency, navigate } = useAppContext()
  const [bookings, setBookings] = useState([])
  const [cancelling, setCancelling] = useState(null)

  const fetchUserBookings = async () => {
    try {
      const { data } = await axios.get('/api/bookings/user', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) setBookings(data.bookings)
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
  }

  const handlePayment = async (bookingId) => {
    try {
      const { data } = await axios.post('/api/bookings/stripe-payment', { bookingId }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) window.location.href = data.url
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(bookingId)
    try {
      const { data } = await axios.post(`/api/bookings/cancel/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) { toast.success(data.message); fetchUserBookings() }
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
    finally { setCancelling(null) }
  }

  const canReview = (b) =>
    b.status !== 'cancelled' && new Date(b.checkOutDate) < new Date()

  useEffect(() => { if (user) fetchUserBookings() }, [user])

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-500',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || ''}`}>{status}</span>
  }

  return (
    <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
      <Title title='My Bookings' align='left'
        subTitle='Manage your past, current, and upcoming hotel reservations in one place.'/>

      <div className='max-w-6xl mt-8 w-full text-gray-800'>
        <div className='hidden md:grid md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 font-medium text-base py-3'>
          <div>Hotels</div><div>Date &amp; Timings</div><div>Payment</div>
        </div>

        {bookings.length === 0 && (
          <p className='text-gray-400 py-10 text-center'>No bookings yet. <span className='text-primary cursor-pointer underline' onClick={() => navigate('/rooms')}>Browse rooms</span></p>
        )}

        {bookings.map(booking => (
          <div key={booking._id} className={`grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 py-6 first:border-t ${booking.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div className='flex flex-col md:flex-row gap-3'>
              <img className='w-full md:w-40 h-28 rounded-lg shadow object-cover' src={booking.room.images[0]} alt=''/>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <p className='font-playfair text-xl'>{booking.hotel.name}
                    <span className='font-inter text-sm'> ({booking.room.roomType})</span>
                  </p>
                  {statusBadge(booking.status)}
                  {booking.bookingType === 'hourly' && (
                    <span className='text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full'>⏰ Hourly</span>
                  )}
                </div>
                <div className='flex items-center gap-1 text-sm text-gray-500'>
                  <img src={assets.locationIcon} alt=''/><span>{booking.hotel.address}</span>
                </div>
                <div className='flex items-center gap-1 text-sm text-gray-500'>
                  <img src={assets.guestsIcon} alt=''/><span>Guests: {booking.guests}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <p className='text-base font-medium'>{currency}{booking.totalPrice}</p>
                  {booking.discountApplied > 0 && (
                    <span className='text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full'>-{booking.discountApplied}% promo</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className='flex gap-2 mt-1 flex-wrap'>
                  {booking.status !== 'cancelled' && new Date(booking.checkInDate) > new Date() && (
                    <button onClick={() => handleCancel(booking._id)} disabled={cancelling === booking._id}
                      className='text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 cursor-pointer disabled:opacity-50'>
                      {cancelling === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                  {canReview(booking) && (
                    <button onClick={() => { navigate(`/rooms/${booking.room._id}`); scrollTo(0,0); }}
                      className='text-xs text-blue-500 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-50 cursor-pointer'>
                      ✏️ Write Review
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-row md:flex-col md:justify-center gap-6 md:gap-2 mt-3 text-sm'>
              {booking.bookingType === 'hourly' ? (
                <div>
                  <p className='text-gray-500'>Date</p>
                  <p className='font-medium'>{new Date(booking.checkInDate).toDateString()}</p>
                  <p className='text-gray-500 mt-1'>{booking.checkInTime} – {booking.checkOutTime}</p>
                </div>
              ) : (<>
                <div>
                  <p className='text-gray-500'>Check-In</p>
                  <p className='font-medium'>{new Date(booking.checkInDate).toDateString()}</p>
                </div>
                <div>
                  <p className='text-gray-500'>Check-Out</p>
                  <p className='font-medium'>{new Date(booking.checkOutDate).toDateString()}</p>
                </div>
              </>)}
            </div>

            <div className='flex flex-col items-start justify-center pt-3 gap-2'>
              <div className='flex items-center gap-2'>
                <div className={`h-3 w-3 rounded-full ${booking.isPaid ? 'bg-green-500' : booking.status === 'cancelled' ? 'bg-gray-400' : 'bg-red-500'}`}/>
                <p className={`text-sm ${booking.isPaid ? 'text-green-600' : booking.status === 'cancelled' ? 'text-gray-400' : 'text-red-500'}`}>
                  {booking.isPaid ? 'Paid' : booking.status === 'cancelled' ? 'Cancelled' : 'Unpaid'}
                </p>
              </div>
              {!booking.isPaid && booking.status !== 'cancelled' && (
                <button onClick={() => handlePayment(booking._id)}
                  className='px-4 py-1.5 text-xs border border-gray-400 rounded-full hover:bg-gray-50 cursor-pointer'>
                  Pay Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyBookings
