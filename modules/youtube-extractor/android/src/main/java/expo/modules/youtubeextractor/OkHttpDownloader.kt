package expo.modules.youtubeextractor

import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class MemoryCookieJar : CookieJar {
    private val cookieStore = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        val current = cookieStore.getOrPut(host) { mutableListOf() }
        synchronized(current) {
            cookies.forEach { newCookie ->
                current.removeAll { it.name == newCookie.name }
                current.add(newCookie)
            }
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val host = url.host
        val current = cookieStore[host] ?: return emptyList()
        val now = System.currentTimeMillis()
        synchronized(current) {
            current.removeAll { it.expiresAt < now }
            return current.toList()
        }
    }
}

class OkHttpDownloader private constructor(private val client: OkHttpClient) : Downloader {

    companion object {
        private const val USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        
        @Volatile
        private var instance: OkHttpDownloader? = null

        fun getInstance(): OkHttpDownloader {
            return instance ?: synchronized(this) {
                instance ?: OkHttpDownloader(
                    OkHttpClient.Builder()
                        .cookieJar(MemoryCookieJar())
                        .readTimeout(30, TimeUnit.SECONDS)
                        .connectTimeout(15, TimeUnit.SECONDS)
                        .followRedirects(true)
                        .build()
                ).also { instance = it }
            }
        }
    }


    override fun execute(request: Request): Response {
        val httpMethod = request.httpMethod()
        val url = request.url()
        val headers = request.headers()
        val dataToSend = request.dataToSend()

        val reqBuilder = okhttp3.Request.Builder()
            .url(url)
            .header("User-Agent", USER_AGENT)

        headers?.forEach { (key, values) ->
            reqBuilder.removeHeader(key)
            values?.forEach { value ->
                reqBuilder.addHeader(key, value)
            }
        }

        val requestBody = if (dataToSend != null) {
            dataToSend.toRequestBody(null as okhttp3.MediaType?)
        } else if (httpMethod.equals("POST", ignoreCase = true) || httpMethod.equals("PUT", ignoreCase = true)) {
            ByteArray(0).toRequestBody(null as okhttp3.MediaType?)
        } else {
            null
        }
        reqBuilder.method(httpMethod, requestBody)

        val okResponse = client.newCall(reqBuilder.build()).execute()
        val responseBody = okResponse.body?.string().orEmpty()
        val responseHeaders = okResponse.headers.toMultimap()

        return Response(
            okResponse.code,
            okResponse.message,
            responseHeaders,
            responseBody,
            okResponse.request.url.toString()
        )
    }
}
