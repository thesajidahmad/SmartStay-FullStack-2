import React, { useEffect, useState } from 'react'
import { assets, roomCommonData } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const StarInput = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)}
        className={`text-2xl ${n <= value ? 'text-yellow-400' : 'text-gray-300'} cursor-pointer`}>★</button>
    ))}
  </div>
);

const StarDisplay = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(n => (
      <span key={n} className={`text-sm ${n <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
    ))}
  </div>
);

const RoomDetails = () => {
  const { id } = useParams();
  const { facilityIcons, rooms, getToken, axios, navigate, currency, user } = useAppContext();

  const [room, setRoom] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [bookingType, setBookingType] = useState('nightly');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [hourlyDate, setHourlyDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [isAvailable, setIsAvailable] = useState(false);

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [userBookings, setUserBookings] = useState([]);

  const fetchReviews = async () => {
    const { data } = await axios.get(`/api/reviews/room/${id}`);
    if (data.success) { setReviews(data.reviews); setAvgRating(data.averageRating); }
  };

  const fetchUserBookings = async () => {
    if (!user) return;
    const { data } = await axios.get('/api/bookings/user', {
      headers: { Authorization: `Bearer ${await getToken()}` }
    });
    if (data.success) {
      setUserBookings(data.bookings.filter(b =>
        b.room._id === id && b.status !== 'cancelled' &&
        new Date(b.checkOutDate) < new Date()
      ));
    }
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await axios.post('/api/promos/validate', { code: promoCode }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if (data.success) { setPromoDiscount(data.discountPercent); toast.success(data.message); }
      else { setPromoDiscount(0); toast.error(data.message); }
    } catch { toast.error('Failed to apply promo'); }
    finally { setPromoLoading(false); }
  };

  const checkAvailability = async () => {
    const dateIn = bookingType === 'hourly' ? hourlyDate : checkInDate;
    const dateOut = bookingType === 'hourly' ? hourlyDate : checkOutDate;
    if (bookingType === 'nightly' && checkInDate >= checkOutDate) return toast.error('Check-out must be after check-in');
    if (bookingType === 'hourly' && checkInTime >= checkOutTime) return toast.error('Check-out time must be after check-in');
    try {
      const { data } = await axios.post('/api/bookings/check-availability', { room: id, checkInDate: dateIn, checkOutDate: dateOut });
      if (data.success) { setIsAvailable(data.isAvailable); data.isAvailable ? toast.success('Room is available!') : toast.error('Room is not available'); }
    } catch (e) { toast.error(e.message); }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!isAvailable) return checkAvailability();
    try {
      const dateIn = bookingType === 'hourly' ? hourlyDate : checkInDate;
      const dateOut = bookingType === 'hourly' ? hourlyDate : checkOutDate;
      const payload = {
        room: id, checkInDate: dateIn, checkOutDate: dateOut, guests, bookingType,
        ...(bookingType === 'hourly' && { checkInTime, checkOutTime }),
        ...(promoDiscount > 0 && { promoCode }),
      };
      const { data } = await axios.post('/api/bookings/book', payload, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if (data.success) { toast.success(data.message); navigate('/my-bookings'); scrollTo(0,0); }
      else toast.error(data.message);
    } catch (e) { toast.error(e.message); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewBookingId) return toast.error('Select which booking to review');
    try {
      const { data } = await axios.post('/api/reviews', {
        bookingId: reviewBookingId, rating: reviewRating, comment: reviewComment
      }, { headers: { Authorization: `Bearer ${await getToken()}` } });
      if (data.success) {
        toast.success('Review submitted!');
        setShowReviewForm(false); setReviewComment(''); setReviewRating(5); setReviewBookingId('');
        fetchReviews();
      } else toast.error(data.message);
    } catch (e) { toast.error(e.message); }
  };

  // Computed price
  const basePrice = (() => {
    if (!room) return null;
    if (bookingType === 'nightly' && checkInDate && checkOutDate && checkOutDate > checkInDate) {
      const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / 86400000);
      return { amount: room.pricePerNight * nights, label: `${nights} night${nights>1?'s':''}` };
    }
    if (bookingType === 'hourly' && checkInTime && checkOutTime && checkOutTime > checkInTime) {
      const [ih,im] = checkInTime.split(':').map(Number), [oh,om] = checkOutTime.split(':').map(Number);
      const hrs = Math.ceil(((oh*60+om)-(ih*60+im))/60);
      return { amount: (room.pricePerHour||0)*hrs, label: `${hrs} hr${hrs>1?'s':''}` };
    }
    return null;
  })();
  const finalPrice = basePrice ? { ...basePrice, amount: Math.round(basePrice.amount * (1 - promoDiscount/100)) } : null;

  useEffect(() => {
    const found = rooms.find(r => r._id === id);
    if (found) { setRoom(found); setMainImage(found.images[0]); }
  }, [rooms]);

  useEffect(() => { fetchReviews(); fetchUserBookings(); }, [id, user]);
  useEffect(() => { setIsAvailable(false); }, [checkInDate, checkOutDate, hourlyDate, checkInTime, checkOutTime, bookingType]);

  return room && (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
      {/* Header */}
      <div className='flex flex-col md:flex-row items-start md:items-center gap-2'>
        <h1 className='text-3xl md:text-4xl font-playfair'>{room.hotel.name}
          <span className='font-inter text-sm'> ({room.roomType})</span>
        </h1>
        <p className='text-xs font-inter py-1.5 px-3 text-white bg-orange-500 rounded-full'>20% OFF</p>
      </div>

      {/* Rating summary */}
      <div className='flex items-center gap-2 mt-2'>
        {avgRating ? (
          <><StarDisplay rating={avgRating} /><span className='text-sm font-medium'>{avgRating}</span>
          <span className='text-sm text-gray-500'>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span></>
        ) : <span className='text-sm text-gray-400'>No reviews yet</span>}
      </div>

      <div className='flex items-center gap-1 text-gray-500 mt-2'>
        <img src={assets.locationIcon} alt=''/><span>{room.hotel.address}</span>
      </div>

      {/* Images */}
      <div className='flex flex-col lg:flex-row mt-6 gap-6'>
        <div className='lg:w-1/2 w-full'>
          <img className='w-full rounded-xl shadow-lg object-cover' src={mainImage} alt='Room'/>
        </div>
        <div className='grid grid-cols-2 gap-4 lg:w-1/2 w-full'>
          {room.images.map((img, i) => (
            <img key={i} onClick={() => setMainImage(img)} src={img} alt=''
              className={`w-full rounded-xl shadow-md object-cover cursor-pointer ${mainImage===img?'outline outline-2 outline-orange-500':''}`}/>
          ))}
        </div>
      </div>

      {/* Price + amenities */}
      <div className='flex flex-col md:flex-row md:justify-between mt-10'>
        <div>
          <h1 className='text-3xl md:text-4xl font-playfair'>Experience Luxury Like Never Before</h1>
          <div className='flex flex-wrap items-center mt-3 mb-6 gap-4'>
            {room.amenities.map((item, i) => (
              <div key={i} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100'>
                <img src={facilityIcons[item]} alt={item} className='w-5 h-5'/><p className='text-xs'>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className='text-right'>
          <p className='text-2xl font-medium'>{currency}{room.pricePerNight}<span className='text-sm font-normal'>/night</span></p>
          {room.pricePerHour && <p className='text-lg font-medium text-orange-500 mt-1'>{currency}{room.pricePerHour}<span className='text-sm font-normal'>/hour</span></p>}
        </div>
      </div>

      {/* Booking form */}
      <form onSubmit={onSubmitHandler} className='bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.15)] p-6 rounded-xl mx-auto mt-16 max-w-6xl'>
        <div className='flex gap-2 mb-6'>
          <button type='button' onClick={() => setBookingType('nightly')}
            className={`px-5 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${bookingType==='nightly'?'bg-black text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            🌙 Nightly
          </button>
          {room.pricePerHour && (
            <button type='button' onClick={() => setBookingType('hourly')}
              className={`px-5 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${bookingType==='hourly'?'bg-orange-500 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              ⏰ Hourly
            </button>
          )}
        </div>

        <div className='flex flex-col md:flex-row items-start md:items-end justify-between gap-6'>
          <div className='flex flex-col flex-wrap md:flex-row items-start md:items-center gap-4 md:gap-8 text-gray-500'>
            {bookingType === 'nightly' ? (<>
              <div className='flex flex-col'>
                <label className='font-medium text-gray-700 mb-1'>Check-In</label>
                <input onChange={e=>setCheckInDate(e.target.value)} type='date' min={new Date().toISOString().split('T')[0]}
                  className='rounded border border-gray-300 px-3 py-2 outline-none' required/>
              </div>
              <div className='w-px h-12 bg-gray-300/70 max-md:hidden'/>
              <div className='flex flex-col'>
                <label className='font-medium text-gray-700 mb-1'>Check-Out</label>
                <input onChange={e=>setCheckOutDate(e.target.value)} type='date'
                  min={checkInDate || new Date().toISOString().split('T')[0]} disabled={!checkInDate}
                  className='rounded border border-gray-300 px-3 py-2 outline-none disabled:opacity-50' required/>
              </div>
            </>) : (<>
              <div className='flex flex-col'>
                <label className='font-medium text-gray-700 mb-1'>Date</label>
                <input onChange={e=>setHourlyDate(e.target.value)} type='date' min={new Date().toISOString().split('T')[0]}
                  className='rounded border border-gray-300 px-3 py-2 outline-none' required/>
              </div>
              <div className='w-px h-12 bg-gray-300/70 max-md:hidden'/>
              <div className='flex flex-col'>
                <label className='font-medium text-gray-700 mb-1'>From</label>
                <input onChange={e=>setCheckInTime(e.target.value)} type='time'
                  className='rounded border border-gray-300 px-3 py-2 outline-none' required/>
              </div>
              <div className='w-px h-12 bg-gray-300/70 max-md:hidden'/>
              <div className='flex flex-col'>
                <label className='font-medium text-gray-700 mb-1'>Until</label>
                <input onChange={e=>setCheckOutTime(e.target.value)} type='time'
                  className='rounded border border-gray-300 px-3 py-2 outline-none' required/>
              </div>
            </>)}
            <div className='w-px h-12 bg-gray-300/70 max-md:hidden'/>
            <div className='flex flex-col'>
              <label className='font-medium text-gray-700 mb-1'>Guests</label>
              <input onChange={e=>setGuests(e.target.value)} value={guests} type='number' min={1}
                className='max-w-20 rounded border border-gray-300 px-3 py-2 outline-none' required/>
            </div>
          </div>

          <div className='flex flex-col items-end gap-2 max-md:w-full'>
            {/* Promo code */}
            <div className='flex gap-2'>
              <input value={promoCode} onChange={e=>{ setPromoCode(e.target.value); setPromoDiscount(0); }}
                placeholder='Promo code' className='border border-gray-300 rounded px-3 py-1.5 text-sm outline-none w-36'/>
              <button type='button' onClick={applyPromo} disabled={promoLoading}
                className='bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer'>
                {promoLoading ? '...' : 'Apply'}
              </button>
            </div>

            {finalPrice && (
              <div className='text-right text-sm'>
                {promoDiscount > 0 && (
                  <p className='text-gray-400 line-through'>{currency}{basePrice.amount}</p>
                )}
                <p className='text-gray-800 font-medium'>
                  {currency}{finalPrice.amount}
                  <span className='text-xs text-gray-500 ml-1'>({finalPrice.label}{promoDiscount>0?`, -${promoDiscount}%`:''})</span>
                </p>
              </div>
            )}

            <button type='submit'
              className={`${bookingType==='hourly'?'bg-orange-500 hover:bg-orange-600':'bg-primary hover:bg-primary-dull'} active:scale-95 transition-all text-white rounded-md max-md:w-full px-10 py-3 text-base cursor-pointer`}>
              {isAvailable ? 'Book Now' : 'Check Availability'}
            </button>
          </div>
        </div>
      </form>

      {/* Common specs */}
      <div className='mt-16 space-y-4'>
        {roomCommonData.map((spec, i) => (
          <div key={i} className='flex items-start gap-2'>
            <img className='w-6' src={spec.icon} alt=''/><div>
              <p className='text-base'>{spec.title}</p>
              <p className='text-gray-500'>{spec.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reviews section */}
      <div className='mt-16 max-w-3xl'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-playfair'>Guest Reviews</h2>
          {user && userBookings.length > 0 && (
            <button onClick={() => setShowReviewForm(!showReviewForm)}
              className='text-sm border border-gray-300 px-4 py-2 rounded-full hover:bg-gray-50 cursor-pointer'>
              {showReviewForm ? 'Cancel' : '✏️ Write a Review'}
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={submitReview} className='bg-gray-50 rounded-xl p-5 mb-8 border border-gray-200'>
            <p className='font-medium mb-3'>Share your experience</p>
            <select value={reviewBookingId} onChange={e=>setReviewBookingId(e.target.value)}
              className='border border-gray-300 rounded px-3 py-2 text-sm w-full mb-3 outline-none' required>
              <option value=''>Select your stay</option>
              {userBookings.map(b => (
                <option key={b._id} value={b._id}>
                  {new Date(b.checkInDate).toDateString()} – {new Date(b.checkOutDate).toDateString()}
                </option>
              ))}
            </select>
            <StarInput value={reviewRating} onChange={setReviewRating}/>
            <textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)}
              placeholder='Tell us about your stay...' rows={3} required
              className='w-full border border-gray-300 rounded px-3 py-2 text-sm mt-3 outline-none resize-none'/>
            <button type='submit' className='mt-3 bg-black text-white text-sm px-6 py-2 rounded-full hover:bg-gray-800 cursor-pointer'>
              Submit Review
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className='text-gray-400 text-sm'>No reviews yet. Be the first to review!</p>
        ) : (
          <div className='space-y-6'>
            {reviews.map(r => (
              <div key={r._id} className='border-b border-gray-100 pb-6'>
                <div className='flex items-center gap-3 mb-2'>
                  <img src={r.user?.image || assets.userIcon} className='w-9 h-9 rounded-full object-cover' alt=''/>
                  <div>
                    <p className='text-sm font-medium'>{r.user?.username || 'Guest'}</p>
                    <p className='text-xs text-gray-400'>{new Date(r.createdAt).toDateString()}</p>
                  </div>
                  <div className='ml-auto'><StarDisplay rating={r.rating}/></div>
                </div>
                <p className='text-gray-600 text-sm'>{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDetails;
