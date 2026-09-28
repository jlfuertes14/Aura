package expo.modules.youtubeextractor

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem

class YouTubeExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YouTubeExtractor")

    OnCreate {
      try {
        NewPipe.init(
          OkHttpDownloader.getInstance(),
          org.schabi.newpipe.extractor.localization.Localization.DEFAULT,
          org.schabi.newpipe.extractor.localization.ContentCountry.DEFAULT
        )
      } catch (e: Exception) {
        // Already initialized
      }
    }

    AsyncFunction("extractAudioStream") { videoId: String ->
      try {
        val url = "https://www.youtube.com/watch?v=$videoId"
        val streamInfo = StreamInfo.getInfo(ServiceList.YouTube, url)
        val audioStreams = streamInfo.audioStreams

        if (audioStreams.isNullOrEmpty()) {
          throw Exception("No audio streams available for $videoId")
        }

        // Prioritize M4A format (AAC audio, itag 140 / 128-160kbps), then highest bitrate
        val bestM4a = audioStreams
          .filter { it.format?.suffix?.equals("m4a", ignoreCase = true) == true }
          .maxByOrNull { it.averageBitrate }

        val selectedStream = bestM4a ?: audioStreams.maxByOrNull { it.averageBitrate } ?: audioStreams.first()

        mapOf(
          "success" to true,
          "streamUrl" to selectedStream.content,
          "title" to (streamInfo.name ?: ""),
          "duration" to streamInfo.duration,
          "author" to (streamInfo.uploaderName ?: ""),
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

    AsyncFunction("searchYouTube") { query: String ->
      try {
        val searchExtractor = ServiceList.YouTube.getSearchExtractor(query)
        searchExtractor.fetchPage()
        val items = searchExtractor.initialPage?.items ?: emptyList()
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

    AsyncFunction("downloadToFile") { url: String, destinationPath: String ->
      try {
        val request = okhttp3.Request.Builder()
          .url(url)
          .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
          .header("Accept", "*/*")
          .build()

        val response = OkHttpDownloader.getInstance().getClient().newCall(request).execute()
        if (!response.isSuccessful) {
          mapOf(
            "success" to false,
            "error" to "HTTP error: ${response.code}"
          )
        } else {
          val body = response.body ?: throw Exception("Empty response body")
          val cleanPath = if (destinationPath.startsWith("file://")) {
            destinationPath.substring(7)
          } else {
            destinationPath
          }
          val file = java.io.File(cleanPath)
          file.parentFile?.mkdirs()

          file.outputStream().use { output ->
            body.byteStream().use { input ->
              input.copyTo(output)
            }
          }

          mapOf(
            "success" to true,
            "bytesWritten" to file.length()
          )
        }
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "error" to (e.message ?: "Failed to download file")
        )
      }
    }
  }
}

