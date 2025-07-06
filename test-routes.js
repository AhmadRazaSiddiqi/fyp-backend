const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const testConfig = {
  username: 'testuser',
  password: 'testpassword123',
  email: 'test@example.com'
};

let authToken = '';
let testVideoId = '';
let testPlaylistId = '';

// Helper function to make authenticated requests
const makeAuthRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
};

// Test functions
const testAuth = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  // Register user
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, {
      username: testConfig.username,
      email: testConfig.email,
      password: testConfig.password
    });
    console.log('✅ User registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️  User already exists, proceeding with login');
    } else {
      console.log('❌ Registration failed:', error.response?.data || error.message);
      return false;
    }
  }
  
  // Login
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: testConfig.username,
      password: testConfig.password
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
};

const testVideos = async () => {
  console.log('\n📹 Testing Video Routes...');
  
  // Get all videos
  const allVideos = await makeAuthRequest('GET', '/api/home/allVideos');
  if (allVideos && allVideos.allvideos && allVideos.allvideos.length > 0) {
    testVideoId = allVideos.allvideos[0]._id;
    console.log(`✅ Found ${allVideos.allvideos.length} videos, using first video for testing`);
  } else {
    console.log('⚠️  No videos found in database');
    return false;
  }
  
  // Get video stats
  const videoStats = await makeAuthRequest('GET', `/api/videos/${testVideoId}/stats`);
  if (videoStats) {
    console.log('✅ Video stats retrieved:', videoStats.stats);
  }
  
  return true;
};

const testLikeDislike = async () => {
  console.log('\n👍👎 Testing Like/Dislike Routes...');
  
  if (!testVideoId) {
    console.log('❌ No video ID available for testing');
    return false;
  }
  
  // Get initial like status
  const initialStatus = await makeAuthRequest('GET', `/api/videos/${testVideoId}/like-status`);
  if (initialStatus) {
    console.log('✅ Initial like status:', initialStatus);
  }
  
  // Like the video
  const likeResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/like`);
  if (likeResponse) {
    console.log('✅ Video liked:', likeResponse);
  }
  
  // Check like status again
  const afterLikeStatus = await makeAuthRequest('GET', `/api/videos/${testVideoId}/like-status`);
  if (afterLikeStatus) {
    console.log('✅ After like status:', afterLikeStatus);
  }
  
  // Unlike the video
  const unlikeResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/like`);
  if (unlikeResponse) {
    console.log('✅ Video unliked:', unlikeResponse);
  }
  
  // Dislike the video
  const dislikeResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/dislike`);
  if (dislikeResponse) {
    console.log('✅ Video disliked:', dislikeResponse);
  }
  
  // Remove dislike
  const removeDislikeResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/dislike`);
  if (removeDislikeResponse) {
    console.log('✅ Dislike removed:', removeDislikeResponse);
  }
  
  return true;
};

const testPlaylists = async () => {
  console.log('\n📋 Testing Playlist Routes...');
  
  // Create a test playlist
  const createPlaylistResponse = await makeAuthRequest('POST', '/api/playlists', {
    name: 'Test Playlist',
    description: 'A test playlist for API testing'
  });
  
  if (createPlaylistResponse) {
    testPlaylistId = createPlaylistResponse.playlist._id;
    console.log('✅ Playlist created:', createPlaylistResponse.playlist);
  } else {
    console.log('❌ Failed to create playlist');
    return false;
  }
  
  // Get all playlists
  const allPlaylists = await makeAuthRequest('GET', '/api/playlists');
  if (allPlaylists) {
    console.log(`✅ Retrieved ${allPlaylists.totalPlaylists} playlists`);
  }
  
  // Get specific playlist
  const specificPlaylist = await makeAuthRequest('GET', `/api/playlists/${testPlaylistId}`);
  if (specificPlaylist) {
    console.log('✅ Retrieved specific playlist:', specificPlaylist.playlist.name);
  }
  
  return true;
};

const testAddToPlaylist = async () => {
  console.log('\n➕ Testing Add to Playlist...');
  
  if (!testVideoId || !testPlaylistId) {
    console.log('❌ Missing video ID or playlist ID for testing');
    return false;
  }
  
  // Get playlists for video
  const videoPlaylists = await makeAuthRequest('GET', `/api/videos/${testVideoId}/playlists`);
  if (videoPlaylists) {
    console.log('✅ Video playlists retrieved:', videoPlaylists.playlists.length, 'playlists');
  }
  
  // Add video to playlist
  const addToPlaylistResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/add-to-playlist`, {
    playlistId: testPlaylistId
  });
  
  if (addToPlaylistResponse) {
    console.log('✅ Video added to playlist:', addToPlaylistResponse);
  }
  
  // Try to add again (should fail)
  const duplicateAddResponse = await makeAuthRequest('POST', `/api/videos/${testVideoId}/add-to-playlist`, {
    playlistId: testPlaylistId
  });
  
  if (duplicateAddResponse === null) {
    console.log('✅ Correctly prevented duplicate video in playlist');
  }
  
  // Remove video from playlist
  const removeFromPlaylistResponse = await makeAuthRequest('DELETE', `/api/videos/${testVideoId}/remove-from-playlist`, {
    playlistId: testPlaylistId
  });
  
  if (removeFromPlaylistResponse) {
    console.log('✅ Video removed from playlist:', removeFromPlaylistResponse);
  }
  
  return true;
};

const testLikedDislikedVideos = async () => {
  console.log('\n❤️💔 Testing Liked/Disliked Videos Routes...');
  
  // Get liked videos
  const likedVideos = await makeAuthRequest('GET', '/api/likedvideos');
  if (likedVideos) {
    console.log(`✅ Retrieved ${likedVideos.count} liked videos`);
  }
  
  // Get disliked videos
  const dislikedVideos = await makeAuthRequest('GET', '/api/dislikedvideos');
  if (dislikedVideos) {
    console.log(`✅ Retrieved ${dislikedVideos.count} disliked videos`);
  }
  
  // Add a video to liked videos
  if (testVideoId) {
    const addLikedResponse = await makeAuthRequest('POST', '/api/likedvideos', {
      videoId: testVideoId
    });
    
    if (addLikedResponse) {
      console.log('✅ Video added to liked videos:', addLikedResponse.message);
    }
    
    // Check if video is liked
    const checkLikedResponse = await makeAuthRequest('GET', `/api/likedvideos/${testVideoId}/check`);
    if (checkLikedResponse) {
      console.log('✅ Video like check:', checkLikedResponse);
    }
    
    // Remove from liked videos
    const removeLikedResponse = await makeAuthRequest('DELETE', `/api/likedvideos/${testVideoId}`);
    if (removeLikedResponse) {
      console.log('✅ Video removed from liked videos:', removeLikedResponse.message);
    }
  }
  
  return true;
};

const cleanup = async () => {
  console.log('\n🧹 Cleaning up...');
  
  // Delete test playlist
  if (testPlaylistId) {
    const deletePlaylistResponse = await makeAuthRequest('DELETE', `/api/playlists/${testPlaylistId}`);
    if (deletePlaylistResponse) {
      console.log('✅ Test playlist deleted');
    }
  }
  
  console.log('✅ Cleanup completed');
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting API Route Tests...');
  
  try {
    // Test authentication
    const authSuccess = await testAuth();
    if (!authSuccess) {
      console.log('❌ Authentication failed, stopping tests');
      return;
    }
    
    // Test video routes
    const videoSuccess = await testVideos();
    if (!videoSuccess) {
      console.log('⚠️  Video tests failed, some tests will be skipped');
    }
    
    // Test like/dislike functionality
    await testLikeDislike();
    
    // Test playlist functionality
    const playlistSuccess = await testPlaylists();
    if (playlistSuccess) {
      await testAddToPlaylist();
    }
    
    // Test liked/disliked videos routes
    await testLikedDislikedVideos();
    
    // Cleanup
    await cleanup();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testAuth,
  testVideos,
  testLikeDislike,
  testPlaylists,
  testAddToPlaylist,
  testLikedDislikedVideos
}; 