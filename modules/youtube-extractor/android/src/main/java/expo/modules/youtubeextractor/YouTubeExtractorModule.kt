package expo.modules.youtubeextractor

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class YouTubeExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YouTubeExtractor")

    OnCreate {
      try {
        NewPipe.init(OkHttpDownloader.getInstance())
      } catch (e: Exception) {
        // Already initialized
      }
    }

    AsyncFunction("extractAudioStream") { videoId: String ->
      withContext(Dispatchers.IO) {
        try {
          val url = "https://www.youtube.com/watch?v=$videoId"
          val streamInfo = StreamInfo.getInfo(ServiceList.YouTube, url)
          val audioStreams = streamInfo.audioStreams

          if (audioStreams.isNullOrEmpty()) {
            throw Exception("No audio streams available for $videoId")
          }

          // Prioritize M4A format (AAC audio, itag 140 / 128-160kbps), then highest bitrate
          val bestM4a = audioStreams
            .filter { it.format?.suffix.equals("m4a", ignoreCase = true) }
            .maxByOrNull { it.averageBitrate }

          val selectedStream = bestM4a ?: audioStreams.maxByOrNull { it.averageBitrate } ?: audioStreams.first()

          mapOf(
            "success" to true,
            "streamUrl" to selectedStream.content,
            "title" to streamInfo.name,
            "duration" to streamInfo.duration,
            "author" to streamInfo.uploaderName,
            "bitrate" to selectedStream.averageBitrate,
            "format" to (selectedStream.format?.suffix ?: "m4a")
          )
        } catch (e: Exception) {
          mapOf(
            "success" to false,
            "error" to (e.message ?: "Failed to extract YouTube stream")
          )
        }
      }
    }

    AsyncFunction("searchYouTube") { query: String ->
      withContext(Dispatchers.IO) {
        try {
          val searchExtractor = ServiceList.YouTube.getSearchExtractor(query)
          searchExtractor.fetchPage()
          val items = searchExtractor.initialPage.items
          val results = items.filterIsInstance<StreamInfoItem>().take(10).map { item ->
            val vidId = item.url?.substringAfter("v=")?.substringBefore("&") ?: ""
            mapOf(
              "videoId" to vidId,
              "url" to (item.url ?: ""),
              "title" to (item.name ?: ""),
              "author" to (item.uploaderName ?: ""),
              "duration" to item.duration,
              "thumbnailUrl" to (item.thumbnails?.lastOrNull()?.url ?: "https://img.youtube.com/vi/$vidId/hqdefault.jpg")
            )
          }
          mapOf(
            "success" to true,
            "results" to results
          )
        } catch (e: Exception) {
          mapOf(
            "success" to false,
            "error" to (e.message ?: "Failed to search YouTube"),
            "results" to emptyList<Map<String, Any>>()
          )
        }
      }
    }
  }
}

