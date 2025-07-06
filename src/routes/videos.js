const express = require("express");
const multer = require("multer");
const Video = require("../models/Video");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");
const { upload } = require("../utils/upload");
const cloudinary = require("cloudinary");

const router = express.Router();

// Upload video route
router.post(
  "/upload-video",
  authenticateToken,
  upload.single("video"),
  async (req, res) => {
    try {
      console.log('Upload request received:', req.body);
      console.log('File uploaded:', req.file);
      
      const { title, category, description } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!title || !category) {
        return res.status(400).json({ error: "Title and category are required" });
      }

      const user = await User.findOne({ username: req.user.username });
      if (!user) return res.status(404).json({ error: "User not found" });

      console.log('User found:', user.username);

      const videoSrcUrl = req.file.path;
      let thumbnail = videoSrcUrl.replace('/upload/', '/upload/so_0/').replace(/\.(mp4|mkv|avi|mov)$/i, '.jpg');

      console.log('Video URL:', videoSrcUrl);
      console.log('Thumbnail URL:', thumbnail);

      const video = new Video({
        title,
        videoSrcUrl: videoSrcUrl,
        category,
        likes: 0,
        dislikes: 0,
        uploadedBy: user._id,
        thumbnail: thumbnail,
        description: description || '',
      });
      
      console.log('Video object created:', video);
      
      await video.save();
      
      console.log('Video saved to database with ID:', video._id);

      res.json({
        message: "Video uploaded and saved successfully",
        videoSrcUrl: videoSrcUrl,
        thumbnail: thumbnail,
        video,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: "Error uploading or saving video",
        message: error.message,
      });
    }
  }
);

// Get all videos for home page (matches frontend expectation)
router.get('/home/allVideos', async (req, res) => {
  try {
    console.log('Fetching all videos from database...');
    
    const videos = await Video.find({})
      .populate('uploadedBy', 'username')
      .select('title thumbnail views uploadedAt description uploadedBy category videoSrcUrl');
    
    console.log('Found videos in database:', videos.length);
    console.log('Sample video:', videos[0]);
    
    const formatted = videos.map(v => ({
      _id: v._id,
      title: v.title,
      thumbnail: v.thumbnail,
      views: v.views,
      uploadedAt: v.uploadedAt,
      description: v.description,
      category: v.category,
      videoSrcUrl: v.videoSrcUrl,
      uploader: v.uploadedBy && v.uploadedBy.username ? v.uploadedBy.username : v.uploadedBy
    }));
    
    console.log('Formatted videos:', formatted.length);
    console.log('Sample formatted video:', formatted[0]);
    
    res.json({ allvideos: formatted });
  } catch (err) {
    console.error('Error fetching videos:', err);
    res.status(500).json({ error: 'Failed to fetch videos', details: err.message });
  }
});

// Get trending videos (most viewed)
router.get('/home/trendingvideos', async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('uploadedBy', 'username')
      .sort({ views: -1 })
      .limit(10)
      .select('title thumbnail views uploadedAt description uploadedBy category');
    const formatted = videos.map(v => ({
      _id: v._id,
      title: v.title,
      thumbnail: v.thumbnail,
      views: v.views,
      uploadedAt: v.uploadedAt,
      description: v.description,
      category: v.category,
      videoSrcUrl: v.videoSrcUrl,
      uploader: v.uploadedBy && v.uploadedBy.username ? v.uploadedBy.username : v.uploadedBy
    }));
    res.json({ trendingvideos: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending videos' });
  }
});

// Get all videos (legacy endpoint)
router.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('uploadedBy', 'username')
      .select('title thumbnail views uploadedAt description uploadedBy');
    const formatted = videos.map(v => ({
      _id: v._id,
      title: v.title,
      thumbnail: v.thumbnail,
      views: v.views,
      uploadedAt: v.uploadedAt,
      description: v.description,
      uploader: v.uploadedBy && v.uploadedBy.username ? v.uploadedBy.username : v.uploadedBy
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get single video by ID
router.get('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('uploadedBy', 'username');
    if (!video) return res.status(404).json({ error: 'Video not found' });
    video.views += 1;
    await video.save();
    res.json({
      _id: video._id,
      title: video.title,
      videoSrcUrl: video.videoSrcUrl,
      thumbnail: video.thumbnail,
      views: video.views,
      uploadedAt: video.uploadedAt,
      description: video.description,
      category: video.category,
      uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Like a video
router.post('/videos/:id/like', authenticateToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    const user = await User.findOne({ username: req.user.username });
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if user already liked the video
    const alreadyLiked = user.likedVideos.includes(video._id);
    
    if (!alreadyLiked) {
      // Add to liked videos
      video.likes += 1;
      user.likedVideos.push(video._id);
      
      // Remove from disliked videos if present
      const wasDisliked = user.dislikedVideos.includes(video._id);
      if (wasDisliked) {
        video.dislikes = Math.max(0, video.dislikes - 1);
        user.dislikedVideos = user.dislikedVideos.filter(vId => !vId.equals(video._id));
      }
      
      await video.save();
      await user.save();
      
      res.json({ 
        success: true,
        likes: video.likes,
        dislikes: video.dislikes,
        message: 'Video liked successfully'
      });
    } else {
      // Unlike the video
      video.likes = Math.max(0, video.likes - 1);
      user.likedVideos = user.likedVideos.filter(vId => !vId.equals(video._id));
      
      await video.save();
      await user.save();
      
      res.json({ 
        success: true,
        likes: video.likes,
        dislikes: video.dislikes,
        message: 'Video unliked successfully'
      });
    }
  } catch (err) {
    console.error('Like video error:', err);
    res.status(500).json({ error: 'Failed to like video', details: err.message });
  }
});

// Dislike a video
router.post('/videos/:id/dislike', authenticateToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    const user = await User.findOne({ username: req.user.username });
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if user already disliked the video
    const alreadyDisliked = user.dislikedVideos.includes(video._id);
    
    if (!alreadyDisliked) {
      // Add to disliked videos
      video.dislikes += 1;
      user.dislikedVideos.push(video._id);
      
      // Remove from liked videos if present
      const wasLiked = user.likedVideos.includes(video._id);
      if (wasLiked) {
        video.likes = Math.max(0, video.likes - 1);
        user.likedVideos = user.likedVideos.filter(vId => !vId.equals(video._id));
      }
      
      await video.save();
      await user.save();
      
      res.json({ 
        success: true,
        likes: video.likes,
        dislikes: video.dislikes,
        message: 'Video disliked successfully'
      });
    } else {
      // Remove dislike
      video.dislikes = Math.max(0, video.dislikes - 1);
      user.dislikedVideos = user.dislikedVideos.filter(vId => !vId.equals(video._id));
      
      await video.save();
      await user.save();
      
      res.json({ 
        success: true,
        likes: video.likes,
        dislikes: video.dislikes,
        message: 'Video dislike removed successfully'
      });
    }
  } catch (err) {
    console.error('Dislike video error:', err);
    res.status(500).json({ error: 'Failed to dislike video', details: err.message });
  }
});

// Get video like/dislike status for current user
router.get('/videos/:id/like-status', authenticateToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    const user = await User.findOne({ username: req.user.username });
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isLiked = user.likedVideos.includes(video._id);
    const isDisliked = user.dislikedVideos.includes(video._id);
    
    res.json({
      isLiked,
      isDisliked,
      likes: video.likes,
      dislikes: video.dislikes
    });
  } catch (err) {
    console.error('Get like status error:', err);
    res.status(500).json({ error: 'Failed to get like status', details: err.message });
  }
});

// Add video to playlist (improved version)
router.post('/videos/:videoId/add-to-playlist', authenticateToken, async (req, res) => {
  try {
    const { playlistId } = req.body;
    const { videoId } = req.params;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Find the playlist
    const playlist = user.playlists.id(playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Check if video is already in playlist
    if (playlist.videos.includes(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Video is already in this playlist' 
      });
    }
    
    // Add video to playlist
    playlist.videos.push(videoId);
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video added to playlist successfully',
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        videoCount: playlist.videos.length
      }
    });
  } catch (err) {
    console.error('Add to playlist error:', err);
    res.status(500).json({ error: 'Failed to add video to playlist', details: err.message });
  }
});

// Remove video from playlist
router.delete('/videos/:videoId/remove-from-playlist', authenticateToken, async (req, res) => {
  try {
    const { playlistId } = req.body;
    const { videoId } = req.params;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Find the playlist
    const playlist = user.playlists.id(playlistId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Remove video from playlist
    playlist.videos = playlist.videos.filter(v => v.toString() !== videoId);
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Video removed from playlist successfully',
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        videoCount: playlist.videos.length
      }
    });
  } catch (err) {
    console.error('Remove from playlist error:', err);
    res.status(500).json({ error: 'Failed to remove video from playlist', details: err.message });
  }
});

// Get user's playlists for a specific video
router.get('/videos/:videoId/playlists', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findOne({ username: req.user.username });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const playlistsWithVideoStatus = user.playlists.map(playlist => ({
      _id: playlist._id,
      name: playlist.name,
      videoCount: playlist.videos.length,
      containsVideo: playlist.videos.includes(videoId)
    }));
    
    res.json({ playlists: playlistsWithVideoStatus });
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).json({ error: 'Failed to get playlists', details: err.message });
  }
});

// List all videos in the 'video-library' folder from Cloudinary
router.get('/cloudinary-videos', async (req, res) => {
  try {
    const result = await cloudinary.search
      .expression('folder:video-library AND resource_type:video')
      .sort_by('created_at','desc')
      .max_results(100)
      .execute();

    const videos = result.resources.map(v => ({
      url: v.secure_url,
      thumbnail: v.secure_url.replace('/upload/', '/upload/so_0/').replace(/\.(mp4|mkv|avi|mov)$/i, '.jpg'),
      public_id: v.public_id,
      created_at: v.created_at,
      duration: v.duration,
      format: v.format,
      original_filename: v.original_filename
    }));

    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos from Cloudinary', message: err.message });
  }
});

// Get videos uploaded by the logged-in user
router.get('/my-videos', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    const videos = await Video.find(
      { uploadedBy: user._id },
      'title thumbnail videoSrcUrl category uploadedAt'
    );
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user videos' });
  }
});

// Add to Favorites
router.post('/api/videos/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const videoId = req.params.id;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.likedVideos.includes(videoId)) {
      user.likedVideos.push(videoId);
    }
    await user.save();
    res.json({ message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Create Playlist
router.post('/api/playlists', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const { name } = req.body;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!name) return res.status(400).json({ error: 'Playlist name required' });
    
    user.playlists.push({ name, videos: [] });
    await user.save();
    
    res.json({ 
      status: 'ok',
      playlists: user.playlists 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Get user's favorite videos
router.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).populate({
      path: 'likedVideos',
      select: 'title thumbnail videoSrcUrl'
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.likedVideos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get user's liked videos
router.get('/api/user/liked-videos', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'likedVideos',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedVideos = user.likedVideos.map(video => ({
      _id: video._id,
      title: video.title,
      thumbnail: video.thumbnail,
      views: video.views,
      uploadedAt: video.uploadedAt,
      description: video.description,
      category: video.category,
      videoSrcUrl: video.videoSrcUrl,
      uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
    }));
    
    res.json({ 
      success: true,
      likedVideos: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Get liked videos error:', err);
    res.status(500).json({ error: 'Failed to get liked videos', details: err.message });
  }
});

// Get user's disliked videos
router.get('/api/user/disliked-videos', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .populate({
        path: 'dislikedVideos',
        select: 'title thumbnail views uploadedAt description category videoSrcUrl uploadedBy',
        populate: {
          path: 'uploadedBy',
          select: 'username'
        }
      });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedVideos = user.dislikedVideos.map(video => ({
      _id: video._id,
      title: video.title,
      thumbnail: video.thumbnail,
      views: video.views,
      uploadedAt: video.uploadedAt,
      description: video.description,
      category: video.category,
      videoSrcUrl: video.videoSrcUrl,
      uploader: video.uploadedBy && video.uploadedBy.username ? video.uploadedBy.username : video.uploadedBy
    }));
    
    res.json({ 
      success: true,
      dislikedVideos: formattedVideos,
      count: formattedVideos.length
    });
  } catch (err) {
    console.error('Get disliked videos error:', err);
    res.status(500).json({ error: 'Failed to get disliked videos', details: err.message });
  }
});

// Get video statistics
router.get('/api/videos/:id/stats', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    res.json({
      success: true,
      stats: {
        views: video.views,
        likes: video.likes,
        dislikes: video.dislikes,
        uploadedAt: video.uploadedAt
      }
    });
  } catch (err) {
    console.error('Get video stats error:', err);
    res.status(500).json({ error: 'Failed to get video statistics', details: err.message });
  }
});

// Add a comment to a video
router.post('/videos/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isUploader = video.uploadedBy && user._id.equals(video.uploadedBy);
    const comment = {
      text,
      user: user._id,
      username: user.username,
      isUploader,
      createdAt: new Date()
    };
    video.comments.push(comment);
    await video.save();
    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment', details: err.message });
  }
});

// Get all comments for a video
router.get('/videos/:id/comments', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('comments.user', 'username');
    if (!video) return res.status(404).json({ error: 'Video not found' });
    // Sort comments by createdAt ascending and ensure user is a string
    const comments = (video.comments || [])
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(c => ({
        ...c.toObject(),
        user: c.user && c.user._id ? c.user._id.toString() : c.user?.toString?.() || ''
      }));
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments', details: err.message });
  }
});

// Update a comment on a video
router.put('/videos/:videoId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Only author or uploader can update
    if (!comment.user.equals(user._id) && !(video.uploadedBy && user._id.equals(video.uploadedBy))) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }
    comment.text = text;
    await video.save();
    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment', details: err.message });
  }
});

// Delete a comment on a video
router.delete('/videos/:videoId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Debug logging
    console.log('Delete comment debug:', {
      videoId: req.params.videoId,
      commentId: req.params.commentId,
      commentUser: comment.user,
      userId: user._id,
      commentUserType: typeof comment.user,
      userIdType: typeof user._id,
      commentUserEquals: comment.user.equals ? comment.user.equals(user._id) : 'no equals method',
      uploader: video.uploadedBy,
      isUploader: video.uploadedBy && user._id.equals(video.uploadedBy)
    });
    // Only author or uploader can delete
    if (!comment.user.equals(user._id) && !(video.uploadedBy && user._id.equals(video.uploadedBy))) {
      console.log('Not authorized to delete this comment', {
        commentUser: comment.user,
        userId: user._id,
        uploader: video.uploadedBy
      });
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    // Remove the comment using array filter (fixes .remove is not a function)
    video.comments = video.comments.filter(
      c => c._id.toString() !== req.params.commentId
    );
    await video.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete comment (server error):', err);
    res.status(500).json({ error: 'Failed to delete comment', details: err.message });
  }
});

module.exports = router; 